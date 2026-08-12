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

function normalizeResult(text) {
  return (text ?? '').replaceAll('\\n', '\n').trim()
}

function buildFormPayload(name, birthDate, birthTime, gender, calendarType, result) {
  return {
    name,
    birth_date: birthDate,
    birth_time: birthTime || null,
    gender,
    calendar_type: calendarType,
    result,
  }
}

function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [gender, setGender] = useState('')
  const [calendarType, setCalendarType] = useState('solar')

  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [error, setError] = useState('')

  const [readings, setReadings] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(
    () => window.matchMedia('(min-width: 721px)').matches,
  )

  const resultRef = useRef(null)
  const formRef = useRef(null)
  const nameInputRef = useRef(null)

  const isViewing = Boolean(selectedId)
  const isBusy = loading || actionLoading
  const userId = session?.user?.id

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      setSession(nextSession)
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!userId) {
      setReadings([])
      setListLoading(false)
      return
    }

    setListLoading(true)
    loadReadings()
  }, [userId])

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
      if (signOutError) {
        throw signOutError
      }
      setSelectedId(null)
      setIsEditing(false)
      setName('')
      setBirthDate('')
      setBirthTime('')
      setGender('')
      setCalendarType('solar')
      setResult('')
      setReadings([])
    } catch (err) {
      setError(err.message || '로그아웃 중 오류가 발생했습니다.')
    } finally {
      setActionLoading(false)
    }
  }
  async function loadReadings() {
    const { data, error: fetchError } = await supabase
      .from('saju_readings')
      .select('id, name, birth_date, birth_time, gender, calendar_type, result, created_at')
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

  function applyReadingToForm(reading) {
    setName(reading.name)
    setBirthDate(reading.birth_date ?? '')
    setBirthTime(formatBirthTime(reading.birth_time))
    setGender(reading.gender ?? '')
    setCalendarType(reading.calendar_type ?? 'solar')
    setResult(normalizeResult(reading.result))
  }

  async function createReading(form, resultText) {
    if (!userId) {
      throw new Error('로그인이 필요합니다.')
    }

    const { data, error: saveError } = await supabase
      .from('saju_readings')
      .insert({
        ...buildFormPayload(
          form.name,
          form.birthDate,
          form.birthTime,
          form.gender,
          form.calendarType,
          resultText,
        ),
        user_id: userId,
      })
      .select('id, name, birth_date, birth_time, gender, calendar_type, result, created_at')
      .single()

    if (saveError) {
      throw saveError
    }

    await loadReadings()
    return data
  }

  async function updateReading(id) {
    const { data, error: updateError } = await supabase
      .from('saju_readings')
      .update(buildFormPayload(name, birthDate, birthTime, gender, calendarType, result))
      .eq('id', id)
      .select('id, name, birth_date, birth_time, gender, calendar_type, result, created_at')
      .single()

    if (updateError) {
      throw updateError
    }

    await loadReadings()
    return data
  }

  async function deleteReading(id) {
    const { error: deleteError } = await supabase.from('saju_readings').delete().eq('id', id)

    if (deleteError) {
      throw deleteError
    }

    await loadReadings()
  }

  function handleNewReading() {
    if (isBusy) return

    setSelectedId(null)
    setIsEditing(false)
    setName('')
    setBirthDate('')
    setBirthTime('')
    setGender('')
    setCalendarType('solar')
    setResult('')
    setError('')

    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      nameInputRef.current?.focus()
    })
  }

  function handleSelectReading(reading) {
    if (isBusy) return

    setSelectedId(reading.id)
    setIsEditing(false)
    applyReadingToForm(reading)
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
    if (reading) {
      applyReadingToForm(reading)
    }
    setIsEditing(false)
    setError('')
  }

  async function handleDeleteReading(id = selectedId) {
    if (!id || isBusy) return

    const reading = readings.find((item) => item.id === id)
    const label = reading?.name ? `${reading.name}님의 사주 기록` : '이 사주 기록'

    if (!window.confirm(`${label}을 삭제할까요?`)) {
      return
    }

    setError('')
    setActionLoading(true)
    try {
      await deleteReading(id)
      if (selectedId === id) {
        setSelectedId(null)
        setIsEditing(false)
        setName('')
        setBirthDate('')
        setBirthTime('')
        setGender('')
        setCalendarType('solar')
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

    if (!name || !birthDate || !gender) {
      setError('이름, 생년월일, 성별은 꼭 입력해 주세요.')
      return
    }

    if (!result.trim()) {
      setError('사주 해석 내용을 입력해 주세요.')
      return
    }

    setError('')
    setActionLoading(true)
    try {
      const updated = await updateReading(selectedId)
      if (updated) {
        applyReadingToForm(updated)
      }
      setIsEditing(false)
    } catch (err) {
      setError(err.message || '수정 중 오류가 발생했습니다.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReinterpret() {
    if (!selectedId || isBusy) return

    if (!name || !birthDate || !gender) {
      setError('이름, 생년월일, 성별은 꼭 입력해 주세요.')
      return
    }

    const form = { name, birthDate, birthTime, gender, calendarType }

    setError('')
    setLoading(true)
    try {
      const finalText = await askSajuInterpretation(form, (text) => setResult(text))
      setResult(finalText)
      const updated = await updateReading(selectedId)
      if (updated) {
        applyReadingToForm(updated)
      }
      setIsEditing(false)
    } catch (err) {
      setError(err.message || '사주 해석 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setResult('')
    setSelectedId(null)
    setIsEditing(false)

    if (!name || !birthDate || !gender) {
      setError('이름, 생년월일, 성별은 꼭 입력해 주세요.')
      return
    }

    const form = { name, birthDate, birthTime, gender, calendarType }

    setLoading(true)
    try {
      const finalText = await askSajuInterpretation(form, (text) => setResult(text))
      const saved = await createReading(form, finalText)
      if (saved?.id) {
        setSelectedId(saved.id)
      }
    } catch (err) {
      setError(err.message || '사주 해석 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const readingFormFields = (disabled) => (
    <>
      <div className="field">
        <label htmlFor="name">이름</label>
        <input
          id="name"
          ref={!isViewing ? nameInputRef : undefined}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름을 입력하세요"
          autoComplete="name"
          disabled={disabled}
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="birthDate">생년월일</label>
          <input
            id="birthDate"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="field">
          <label htmlFor="birthTime">
            태어난 시간 <span className="field__optional">선택</span>
          </label>
          <input
            id="birthTime"
            type="time"
            value={birthTime}
            onChange={(e) => setBirthTime(e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="gender">성별</label>
          <select
            id="gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            disabled={disabled}
          >
            <option value="">선택하세요</option>
            <option value="male">남자</option>
            <option value="female">여자</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="calendarType">양력 / 음력</label>
          <select
            id="calendarType"
            value={calendarType}
            onChange={(e) => setCalendarType(e.target.value)}
            disabled={disabled}
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
          <h2>{name ? `${name}님의 사주` : '사주 해석'}</h2>
          <p className="result__meta">
            {[
              calendarLabel(calendarType),
              formatBirthDate(birthDate),
              birthTime || '시간 모름',
              genderLabel(gender),
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
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
            수정
          </button>
          <button
            type="button"
            className="result__action result__action--danger"
            onClick={handleDeleteReading}
            disabled={isBusy}
          >
            {actionLoading ? '삭제 중...' : '삭제'}
          </button>
          <button type="button" className="result__action result__action--ghost" onClick={handleNewReading} disabled={isBusy}>
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
          <button
            type="button"
            className="sidebar__logout"
            onClick={handleSignOut}
            disabled={isBusy}
          >
            로그아웃
          </button>
        </div>
        <button
          type="button"
          className={`sidebar__new${!isViewing ? ' sidebar__new--active' : ''}`}
          onClick={handleNewReading}
          disabled={isBusy}
        >
          새 사주 만들기
        </button>

        <h2 className="sidebar__title">
          기록
          {!listLoading && readings.length > 0 && (
            <span className="sidebar__count">{readings.length}</span>
          )}
        </h2>

        {listLoading ? (
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
                  <span className="sidebar__item-name">{reading.name}</span>
                  <span className="sidebar__item-meta">
                    {formatBirthDate(reading.birth_date)}
                  </span>
                </button>
                <button
                  type="button"
                  className="sidebar__delete"
                  onClick={() => handleDeleteReading(reading.id)}
                  disabled={isBusy}
                  aria-label={`${reading.name} 기록 삭제`}
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <main className={`app${isViewing ? ' app--reading' : ''}`}>
        {!isViewing && (
          <header className="hero">
            <p className="brand">사주미</p>
            <h1>나를 담은 사주 보기</h1>
            <p className="hero__lead">
              이름과 생년월일을 입력하면, 차분한 시선으로 오늘의 나를 풀어 드립니다.
            </p>
          </header>
        )}

        {isViewing && !isEditing && resultSection}

        {isViewing && isEditing && (
          <form className="panel panel--edit" onSubmit={handleSaveEdit}>
            <p className="panel__eyebrow">기록 수정</p>
            <h2 className="panel__title">{name ? `${name}님의 사주` : '사주 수정'}</h2>

            {readingFormFields(isBusy)}

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
              {actionLoading ? '저장 중...' : '변경 저장'}
            </button>
            <button
              className="submit submit--secondary"
              type="button"
              onClick={handleReinterpret}
              disabled={isBusy}
            >
              {loading ? '풀이 중...' : '다시 풀이 후 저장'}
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

        {!isViewing && (
          <form className="panel" ref={formRef} onSubmit={handleSubmit}>
            {readingFormFields(loading)}

            <button className="submit" type="submit" disabled={loading}>
              {loading ? '풀이 중...' : '사주 보기'}
            </button>
          </form>
        )}

        {error && <p className="error">{error}</p>}

        {!isViewing && resultSection}
      </main>
        </>
      )}
    </div>
  )
}

export default App
