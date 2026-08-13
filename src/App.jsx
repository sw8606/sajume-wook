import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { askSajuInterpretation } from './gemini.js'
import { supabase } from './supabase.js'
import './App.css'

function genderLabel(gender) {
  if (gender === 'male') return '남자'
  if (gender === 'female') return '여자'
  return ''
}

function calendarLabel(calendarType) {
  if (calendarType === 'lunar') return '음력'
  if (calendarType === 'solar') return '양력'
  return ''
}

function formatBirthDate(date) {
  if (!date) return ''
  return date.replaceAll('-', '. ')
}

function formatBirthTime(time) {
  if (!time) return ''
  return String(time).slice(0, 5)
}

function formatReadingDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}. ${m}. ${day} ${h}:${min}`
}

function normalizeResult(text) {
  return (text ?? '').replaceAll('\\n', '\n').trim()
}

function emptyProfileForm() {
  return {
    name: '',
    birthDate: '',
    birthTime: '',
    gender: '',
    calendarType: 'solar',
  }
}

function profileToForm(profile) {
  if (!profile) return emptyProfileForm()
  return {
    name: profile.name ?? '',
    birthDate: profile.birth_date ?? '',
    birthTime: formatBirthTime(profile.birth_time),
    gender: profile.gender ?? '',
    calendarType: profile.calendar_type ?? 'solar',
  }
}

function profileMeta(profile) {
  if (!profile) return ''
  return [
    calendarLabel(profile.calendar_type),
    formatBirthDate(profile.birth_date),
    formatBirthTime(profile.birth_time) || '시간 모름',
    genderLabel(profile.gender),
  ]
    .filter(Boolean)
    .join(' · ')
}

function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileForm, setProfileForm] = useState(emptyProfileForm())
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showProfileEdit, setShowProfileEdit] = useState(false)

  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [error, setError] = useState('')
  const [profileError, setProfileError] = useState('')
  const [toast, setToast] = useState('')
  const toastTimerRef = useRef(null)

  const [readings, setReadings] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(
    () => window.matchMedia('(min-width: 721px)').matches,
  )

  const resultRef = useRef(null)
  const formRef = useRef(null)

  const isViewing = Boolean(selectedId)
  const isBusy = loading || actionLoading
  const userId = session?.user?.id
  const needsProfile = Boolean(session) && !profileLoading && !profile
  const isNewReadingScreen = Boolean(session && profile && !selectedId && !showProfileEdit)

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  function showToast(message) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(message)
    toastTimerRef.current = setTimeout(() => {
      setToast('')
      toastTimerRef.current = null
    }, 2200)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      setSession(nextSession)
      setAuthLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!userId) {
      setProfile(null)
      setReadings([])
      setListLoading(false)
      setShowProfileModal(false)
      setShowProfileEdit(false)
      return
    }

    setProfileLoading(true)
    setListLoading(true)
    loadProfile(userId).finally(() => setProfileLoading(false))
    loadReadings()
  }, [userId])

  useEffect(() => {
    if (needsProfile) {
      setShowProfileModal(true)
      setProfileForm(emptyProfileForm())
      setProfileError('')
    } else if (profile) {
      setShowProfileModal(false)
    }
  }, [needsProfile, profile])

  async function handleGoogleSignIn() {
    setError('')
    setActionLoading(true)

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })

    if (signInError) {
      setError(signInError.message || 'Google 로그인에 실패했습니다.')
      setActionLoading(false)
    }
  }

  async function handleSignOut() {
    setActionLoading(true)
    setError('')
    try {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError
      setSelectedId(null)
      setIsEditing(false)
      setShowProfileEdit(false)
      setResult('')
      setReadings([])
      setProfile(null)
    } catch (err) {
      setError(err.message || '로그아웃 중 오류가 발생했습니다.')
    } finally {
      setActionLoading(false)
    }
  }

  async function loadProfile(id = userId) {
    if (!id) return null

    const { data, error: fetchError } = await supabase
      .from('users')
      .select('id, name, birth_date, birth_time, gender, calendar_type, created_at, updated_at')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      console.error(fetchError)
      setError(fetchError.message || '프로필을 불러오지 못했습니다.')
      return null
    }

    setProfile(data)
    return data
  }

  async function loadReadings() {
    const { data, error: fetchError } = await supabase
      .from('saju_readings')
      .select('id, user_id, result, created_at')
      .order('created_at', { ascending: false })

    setListLoading(false)

    if (fetchError) {
      console.error(fetchError)
      return []
    }

    const next = data ?? []
    setReadings(next)
    return next
  }

  async function upsertProfile(form) {
    if (!userId) throw new Error('로그인이 필요합니다.')

    const payload = {
      id: userId,
      name: form.name.trim(),
      birth_date: form.birthDate,
      birth_time: form.birthTime || null,
      gender: form.gender,
      calendar_type: form.calendarType,
      updated_at: new Date().toISOString(),
    }

    const { data, error: saveError } = await supabase
      .from('users')
      .upsert(payload, { onConflict: 'id' })
      .select('id, name, birth_date, birth_time, gender, calendar_type, created_at, updated_at')
      .single()

    if (saveError) throw saveError
    setProfile(data)
    return data
  }

  async function createReading(resultText) {
    if (!userId) throw new Error('로그인이 필요합니다.')
    if (!profile) throw new Error('프로필을 먼저 등록해 주세요.')

    const { data, error: saveError } = await supabase
      .from('saju_readings')
      .insert({
        user_id: userId,
        result: resultText,
      })
      .select('id, user_id, result, created_at')
      .single()

    if (saveError) throw saveError
    await loadReadings()
    return data
  }

  async function updateReading(id, resultText) {
    const { data, error: updateError } = await supabase
      .from('saju_readings')
      .update({ result: resultText })
      .eq('id', id)
      .select('id, user_id, result, created_at')
      .single()

    if (updateError) throw updateError
    await loadReadings()
    return data
  }

  async function deleteReading(id) {
    const { error: deleteError } = await supabase.from('saju_readings').delete().eq('id', id)
    if (deleteError) throw deleteError
    await loadReadings()
  }

  function applyProfileFormChange(field, value) {
    setProfileForm((prev) => ({ ...prev, [field]: value }))
  }

  function validateProfileForm(form) {
    if (!form.name.trim() || !form.birthDate || !form.gender) {
      return '이름, 생년월일, 성별은 꼭 입력해 주세요.'
    }
    return ''
  }

  async function handleSaveProfile(e, { closeEdit = true } = {}) {
    e.preventDefault()
    const message = validateProfileForm(profileForm)
    if (message) {
      setProfileError(message)
      return
    }

    setProfileError('')
    setActionLoading(true)
    try {
      await upsertProfile(profileForm)
      setShowProfileModal(false)
      if (closeEdit) setShowProfileEdit(false)
    } catch (err) {
      setProfileError(err.message || '프로필 저장 중 오류가 발생했습니다.')
    } finally {
      setActionLoading(false)
    }
  }

  function handleOpenProfileEdit() {
    if (!profile || isBusy) return
    setProfileForm(profileToForm(profile))
    setProfileError('')
    setShowProfileEdit(true)
    setSelectedId(null)
    setIsEditing(false)
    setResult('')
    setError('')
  }

  function handleCancelProfileEdit() {
    setProfileForm(profileToForm(profile))
    setProfileError('')
    setShowProfileEdit(false)
  }

  function handleNewReading() {
    if (isBusy || !profile) return

    if (isNewReadingScreen) {
      showToast('이미 새 사주 만들기 화면이에요.')
      requestAnimationFrame(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
      return
    }

    setSelectedId(null)
    setIsEditing(false)
    setShowProfileEdit(false)
    setResult('')
    setError('')
    showToast('새 사주 만들기로 이동했어요.')
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function handleSelectReading(reading) {
    if (isBusy) return
    setSelectedId(reading.id)
    setIsEditing(false)
    setShowProfileEdit(false)
    setResult(normalizeResult(reading.result))
    setError('')
    requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function handleStartEdit() {
    if (isBusy || !selectedId) return
    setIsEditing(true)
    setError('')
  }

  function handleCancelEdit() {
    const reading = readings.find((item) => item.id === selectedId)
    if (reading) setResult(normalizeResult(reading.result))
    setIsEditing(false)
    setError('')
  }

  async function handleDeleteReading(id = selectedId) {
    if (!id || isBusy) return
    if (!window.confirm('이 사주 기록을 삭제할까요?')) return

    setError('')
    setActionLoading(true)
    try {
      await deleteReading(id)
      if (selectedId === id) {
        setSelectedId(null)
        setIsEditing(false)
        setResult('')
      }
    } catch (err) {
      setError(err.message || '삭제 중 오류가 발생했습니다.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    if (!selectedId || isBusy) return
    if (!result.trim()) {
      setError('사주 해석 내용을 입력해 주세요.')
      return
    }

    setError('')
    setActionLoading(true)
    try {
      await updateReading(selectedId, result.trim())
      setIsEditing(false)
    } catch (err) {
      setError(err.message || '수정 중 오류가 발생했습니다.')
    } finally {
      setActionLoading(false)
    }
  }

  function profileAsSajuForm() {
    return {
      name: profile.name,
      birthDate: profile.birth_date,
      birthTime: formatBirthTime(profile.birth_time),
      gender: profile.gender,
      calendarType: profile.calendar_type,
    }
  }

  async function handleReinterpret() {
    if (!selectedId || isBusy || !profile) return

    setError('')
    setLoading(true)
    try {
      const finalText = await askSajuInterpretation(profileAsSajuForm(), (text) => setResult(text))
      setResult(finalText)
      await updateReading(selectedId, finalText)
      setIsEditing(false)
    } catch (err) {
      setError(err.message || '사주 해석 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!profile) {
      setError('프로필을 먼저 등록해 주세요.')
      setShowProfileModal(true)
      return
    }

    setError('')
    setResult('')
    setSelectedId(null)
    setIsEditing(false)

    setLoading(true)
    try {
      const finalText = await askSajuInterpretation(profileAsSajuForm(), (text) => setResult(text))
      const saved = await createReading(finalText)
      if (saved?.id) setSelectedId(saved.id)
    } catch (err) {
      setError(err.message || '사주 해석 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const profileFields = (
    <>
      <div className="field">
        <label htmlFor="profile-name">이름</label>
        <input
          id="profile-name"
          type="text"
          value={profileForm.name}
          onChange={(e) => applyProfileFormChange('name', e.target.value)}
          placeholder="이름을 입력하세요"
          autoComplete="name"
          disabled={actionLoading}
          required
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="profile-birthDate">생년월일</label>
          <input
            id="profile-birthDate"
            type="date"
            value={profileForm.birthDate}
            onChange={(e) => applyProfileFormChange('birthDate', e.target.value)}
            disabled={actionLoading}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="profile-birthTime">
            태어난 시간 <span className="field__optional">선택</span>
          </label>
          <input
            id="profile-birthTime"
            type="time"
            value={profileForm.birthTime}
            onChange={(e) => applyProfileFormChange('birthTime', e.target.value)}
            disabled={actionLoading}
          />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="profile-gender">성별</label>
          <select
            id="profile-gender"
            value={profileForm.gender}
            onChange={(e) => applyProfileFormChange('gender', e.target.value)}
            disabled={actionLoading}
            required
          >
            <option value="">선택하세요</option>
            <option value="male">남자</option>
            <option value="female">여자</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="profile-calendarType">양력 / 음력</label>
          <select
            id="profile-calendarType"
            value={profileForm.calendarType}
            onChange={(e) => applyProfileFormChange('calendarType', e.target.value)}
            disabled={actionLoading}
          >
            <option value="solar">양력</option>
            <option value="lunar">음력</option>
          </select>
        </div>
      </div>
    </>
  )

  const resultSection = (loading || result) && (
    <section
      ref={resultRef}
      className={`result${isViewing || (!loading && result) ? ' result--card' : ''}`}
    >
      {isViewing ? (
        <>
          <p className="result__eyebrow">저장된 해석</p>
          <h2>{profile?.name ? `${profile.name}님의 사주` : '사주 해석'}</h2>
          <p className="result__meta">{profileMeta(profile)}</p>
        </>
      ) : (
        <>
          <p className="result__eyebrow">{loading ? '풀이 중' : '방금 본 해석'}</p>
          <h2>사주 해석</h2>
        </>
      )}

      {loading && !result && (
        <div className="skeleton" aria-hidden="true">
          <div className="skeleton__line skeleton__line--title" />
          <div className="skeleton__line" />
          <div className="skeleton__line" />
          <div className="skeleton__line skeleton__line--short" />
          <div className="skeleton__line" />
          <div className="skeleton__line skeleton__line--mid" />
          <div className="skeleton__line" />
          <div className="skeleton__line skeleton__line--short" />
        </div>
      )}

      {result && (
        <div className={`markdown${loading ? ' markdown--streaming' : ''}`}>
          <ReactMarkdown>{result}</ReactMarkdown>
          {loading && <span className="caret" aria-hidden="true" />}
        </div>
      )}

      {isViewing && !isEditing && (
        <div className="result__actions">
          <button type="button" className="result__action" onClick={handleStartEdit} disabled={isBusy}>
            해석 수정
          </button>
          <button
            type="button"
            className="result__action result__action--danger"
            onClick={() => handleDeleteReading()}
            disabled={isBusy}
          >
            {actionLoading ? '삭제 중...' : '삭제'}
          </button>
          <button
            type="button"
            className="result__action result__action--ghost"
            onClick={handleNewReading}
            disabled={isBusy}
          >
            새 사주 만들기
          </button>
        </div>
      )}
    </section>
  )

  return (
    <div
      className={`page${authLoading || !session ? ' page--auth' : ''}${session && sidebarOpen ? ' page--sidebar-open' : ''}`}
    >
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
      {authLoading ? (
        <main className="auth-shell">
          <p className="auth-shell__message">로그인 상태를 확인하는 중...</p>
        </main>
      ) : !session ? (
        <main className="auth-shell">
          <div className="login">
            <p className="brand">사주미</p>
            <h1>나를 담은 사주 보기</h1>
            <p className="login__lead">
              Google 계정으로 로그인하면 사주 기록을 저장하고 언제든 다시 볼 수 있습니다.
            </p>
            <button
              type="button"
              className="login__google"
              onClick={handleGoogleSignIn}
              disabled={actionLoading}
            >
              {actionLoading ? 'Google로 이동 중...' : 'Google로 시작하기'}
            </button>
            {error && <p className="error">{error}</p>}
          </div>
        </main>
      ) : (
        <>
          {showProfileModal && (
            <div className="modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
              <div className="modal__panel">
                <p className="modal__eyebrow">환영합니다</p>
                <h2 id="profile-modal-title">프로필을 등록해 주세요</h2>
                <p className="modal__lead">
                  한 번만 입력하면 다음부터는 저장된 정보로 바로 사주를 볼 수 있습니다.
                </p>
                <form className="panel" onSubmit={(e) => handleSaveProfile(e, { closeEdit: true })}>
                  {profileFields}
                  {profileError && <p className="error">{profileError}</p>}
                  <button className="submit" type="submit" disabled={actionLoading}>
                    {actionLoading ? '저장 중...' : '저장하고 시작하기'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {sidebarOpen && (
            <button
              type="button"
              className="sidebar-backdrop"
              onClick={() => setSidebarOpen(false)}
              aria-label="사이드바 닫기"
            />
          )}
          {!sidebarOpen && (
            <button
              type="button"
              className="sidebar-fab"
              onClick={() => setSidebarOpen(true)}
              aria-label="기록 열기"
            >
              기록
            </button>
          )}

          <aside
            className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}
            aria-label="저장된 사주 목록"
            aria-hidden={!sidebarOpen}
          >
            <div className="sidebar__header">
              <p className="sidebar__brand">사주미</p>
              <button
                type="button"
                className="sidebar__toggle"
                onClick={() => setSidebarOpen(false)}
                aria-label="사이드바 닫기"
              >
                닫기
              </button>
            </div>

            <div className="sidebar__user">
              <p className="sidebar__user-email">{session.user.email}</p>
              {profile && (
                <p className="sidebar__user-name">{profile.name}</p>
              )}
              <div className="sidebar__user-actions">
                <button
                  type="button"
                  className="sidebar__profile"
                  onClick={handleOpenProfileEdit}
                  disabled={isBusy || !profile}
                >
                  프로필
                </button>
                <button
                  type="button"
                  className="sidebar__logout"
                  onClick={handleSignOut}
                  disabled={isBusy}
                >
                  로그아웃
                </button>
              </div>
            </div>

            <button
              type="button"
              className={`sidebar__new${!isViewing && !showProfileEdit ? ' sidebar__new--active' : ''}`}
              onClick={handleNewReading}
              disabled={isBusy || !profile}
            >
              새 사주 만들기
            </button>

            <h2 className="sidebar__title">
              기록
              {!listLoading && readings.length > 0 && (
                <span className="sidebar__count">{readings.length}</span>
              )}
            </h2>

            {listLoading || profileLoading ? (
              <p className="sidebar__empty">불러오는 중...</p>
            ) : readings.length === 0 ? (
              <p className="sidebar__empty">아직 기록이 없습니다. 새 사주로 시작해 보세요.</p>
            ) : (
              <ul className="sidebar__list">
                {readings.map((reading) => (
                  <li key={reading.id} className="sidebar__row">
                    <button
                      type="button"
                      className={`sidebar__item${selectedId === reading.id ? ' sidebar__item--active' : ''}`}
                      onClick={() => handleSelectReading(reading)}
                      disabled={isBusy}
                      aria-current={selectedId === reading.id ? 'true' : undefined}
                    >
                      <span className="sidebar__item-name">
                        {profile?.name ? `${profile.name}님` : '사주 기록'}
                      </span>
                      <span className="sidebar__item-meta">
                        {formatReadingDate(reading.created_at)}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="sidebar__delete"
                      onClick={() => handleDeleteReading(reading.id)}
                      disabled={isBusy}
                      aria-label="사주 기록 삭제"
                    >
                      삭제
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <main className={`app${isViewing || showProfileEdit ? ' app--reading' : ''}`}>
            {showProfileEdit ? (
              <form className="panel panel--edit" onSubmit={(e) => handleSaveProfile(e)}>
                <p className="panel__eyebrow">프로필</p>
                <h2 className="panel__title">내 정보 수정</h2>
                <p className="panel__lead">변경한 정보는 이후 사주 풀이에 바로 반영됩니다.</p>
                {profileFields}
                {profileError && <p className="error">{profileError}</p>}
                <button className="submit" type="submit" disabled={actionLoading}>
                  {actionLoading ? '저장 중...' : '프로필 저장'}
                </button>
                <button
                  className="submit submit--ghost"
                  type="button"
                  onClick={handleCancelProfileEdit}
                  disabled={actionLoading}
                >
                  취소
                </button>
              </form>
            ) : (
              <>
                {!isViewing && (
                  <header className="hero">
                    <p className="brand">사주미</p>
                    <h1>나를 담은 사주 보기</h1>
                    <p className="hero__lead">
                      프로필에 저장된 정보로 오늘의 나를 차분히 풀어 드립니다.
                    </p>
                  </header>
                )}

                {isViewing && !isEditing && resultSection}

                {isViewing && isEditing && (
                  <form className="panel panel--edit" onSubmit={handleSaveEdit}>
                    <p className="panel__eyebrow">기록 수정</p>
                    <h2 className="panel__title">
                      {profile?.name ? `${profile.name}님의 사주` : '사주 수정'}
                    </h2>
                    <p className="result__meta result__meta--panel">{profileMeta(profile)}</p>

                    <div className="field field--textarea">
                      <label htmlFor="result">사주 해석</label>
                      <textarea
                        id="result"
                        className="field__textarea"
                        value={result}
                        onChange={(e) => setResult(e.target.value)}
                        rows={10}
                        disabled={isBusy}
                        placeholder="사주 해석 내용"
                      />
                    </div>

                    <button className="submit" type="submit" disabled={isBusy}>
                      {actionLoading ? '저장 중...' : '해석 저장'}
                    </button>
                    <button
                      className="submit submit--secondary"
                      type="button"
                      onClick={handleReinterpret}
                      disabled={isBusy}
                    >
                      {loading ? '풀이 중...' : '프로필로 다시 풀이'}
                    </button>
                    <button
                      className="submit submit--ghost"
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={isBusy}
                    >
                      취소
                    </button>
                  </form>
                )}

                {!isViewing && profile && (
                  <form className="panel" ref={formRef} onSubmit={handleSubmit}>
                    <div className="profile-card">
                      <p className="profile-card__eyebrow">내 프로필</p>
                      <h2 className="profile-card__name">{profile.name}</h2>
                      <p className="profile-card__meta">{profileMeta(profile)}</p>
                      <button
                        type="button"
                        className="profile-card__edit"
                        onClick={handleOpenProfileEdit}
                        disabled={isBusy}
                      >
                        프로필 수정
                      </button>
                    </div>

                    <button className="submit" type="submit" disabled={loading}>
                      {loading ? '풀이 중...' : '사주 보기'}
                    </button>
                  </form>
                )}

                {error && <p className="error">{error}</p>}
                {!isViewing && resultSection}
              </>
            )}
          </main>
        </>
      )}
    </div>
  )
}

export default App
