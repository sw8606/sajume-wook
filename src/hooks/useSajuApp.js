import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '../lib/analytics.js'
import { askSajuInterpretation } from '../lib/gemini.js'
import { supabase } from '../lib/supabase.js'
import { normalizeResult } from '../utils/format.js'
import {
  clearPendingReading,
  readPendingReading,
  writePendingReading,
} from '../utils/pendingReading.js'
import {
  emptyProfileForm,
  profileAsSajuForm,
  profileToForm,
  validateProfileForm,
} from '../utils/profileForm.js'
import { getShareUrl, shareLink } from '../utils/share.js'
import { useToast } from './useToast.js'

export function useSajuApp() {
  const { toast, showToast } = useToast()

  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileForm, setProfileForm] = useState(emptyProfileForm())
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showProfileEdit, setShowProfileEdit] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [readingCount, setReadingCount] = useState(null)

  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [error, setError] = useState('')
  const [profileError, setProfileError] = useState('')
  const pendingHandledRef = useRef(false)

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
  const isGuest = !session
  const isResultLocked = Boolean(isGuest && result && !loading)
  const isNewReadingScreen = Boolean(
    ((session && profile) || isGuest) && !selectedId && !showProfileEdit,
  )

  useEffect(() => {
    let cancelled = false

    async function loadReadingCount() {
      const { data, error: countError } = await supabase.rpc('get_reading_count')
      if (cancelled) return
      if (countError) {
        console.error(countError)
        return
      }
      const next = typeof data === 'number' ? data : Number(data)
      if (Number.isFinite(next)) setReadingCount(next)
    }

    loadReadingCount()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      setSession(nextSession)
      setAuthLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      setAuthLoading(false)
      if (event === 'SIGNED_IN') {
        trackEvent('login', { method: 'google' })
      }
      if (event === 'SIGNED_OUT') {
        trackEvent('logout')
      }
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
    if (session || authLoading) return
    const pending = readPendingReading()
    if (!pending) return
    if (pending.form) setProfileForm({ ...emptyProfileForm(), ...pending.form })
    if (pending.result) setResult(normalizeResult(pending.result))
  }, [session, authLoading])

  useEffect(() => {
    if (needsProfile) {
      const pending = readPendingReading()
      setShowProfileModal(true)
      setProfileForm(pending?.form ? { ...emptyProfileForm(), ...pending.form } : emptyProfileForm())
      setProfileError('')
    } else if (profile) {
      setShowProfileModal(false)
    }
  }, [needsProfile, profile])

  useEffect(() => {
    if (!userId || !profile || pendingHandledRef.current) return

    const pending = readPendingReading()
    if (!pending?.result) return

    pendingHandledRef.current = true

    ;(async () => {
      const text = normalizeResult(pending.result)
      setResult(text)
      setShowLoginModal(false)
      setActionLoading(true)
      try {
        const saved = await createReading(text)
        clearPendingReading()
        if (saved?.id) {
          setSelectedId(saved.id)
          setIsEditing(false)
          setShowProfileEdit(false)
        }
        showToast('로그인했어요. 전체 해석을 저장했습니다.')
        requestAnimationFrame(() => {
          resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      } catch (err) {
        pendingHandledRef.current = false
        setError(err.message || '결과 저장에 실패했습니다. 다시 풀이해 주세요.')
      } finally {
        setActionLoading(false)
      }
    })()
  }, [userId, profile])

  async function handleGoogleSignIn(source = 'unknown') {
    trackEvent('login_google_click', { source })
    setError('')
    setActionLoading(true)

    if (result) {
      writePendingReading({
        result,
        form: profileForm,
        savedAt: Date.now(),
      })
    }

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })

    if (signInError) {
      trackEvent('login_google_error')
      setError(signInError.message || 'Google 로그인에 실패했습니다.')
      setActionLoading(false)
    }
  }

  async function handleSignOut() {
    trackEvent('logout_click')
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
      pendingHandledRef.current = false
      clearPendingReading()
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
      .select('id, user_id, result, created_at, share_token')
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
      .select('id, user_id, result, created_at, share_token')
      .single()

    if (saveError) throw saveError
    await loadReadings()
    setReadingCount((prev) => (typeof prev === 'number' ? prev + 1 : prev))
    return data
  }

  async function updateReading(id, resultText) {
    const { data, error: updateError } = await supabase
      .from('saju_readings')
      .update({ result: resultText })
      .eq('id', id)
      .select('id, user_id, result, created_at, share_token')
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

  async function handleShareReading(id = selectedId) {
    const reading = readings.find((item) => item.id === id)
    if (!reading?.share_token) {
      showToast('공유 링크를 아직 만들 수 없어요.')
      return
    }

    trackEvent('share_click', { location: 'result' })
    const url = getShareUrl(reading.share_token)
    const title = profile?.name ? `${profile.name}님의 사주` : '사주미 결과'

    await shareLink({
      title,
      text: '사주미에서 본 사주 결과예요.',
      url,
      onCopied: () => {
        trackEvent('share_success', { method: 'copy' })
        showToast('공유 링크를 복사했어요.')
      },
      onError: () => {
        trackEvent('share_error')
        showToast('공유에 실패했어요. 잠시 후 다시 시도해 주세요.')
      },
    })
  }

  function applyProfileFormChange(field, value) {
    setProfileForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSaveProfile(e, { closeEdit = true } = {}) {
    e.preventDefault()
    const message = validateProfileForm(profileForm)
    if (message) {
      setProfileError(message)
      return
    }

    const context = showProfileModal ? 'modal' : 'edit'
    trackEvent('profile_save', { context })
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
    trackEvent('profile_edit_open')
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
    if (isBusy) return
    if (session && !profile) return

    trackEvent('new_reading_click')
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
    clearPendingReading()
    showToast('새 사주 만들기로 이동했어요.')
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function handleSelectReading(reading) {
    if (isBusy) return
    trackEvent('reading_select')
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
    trackEvent('reading_edit_start')
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

    trackEvent('reading_delete')
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

    trackEvent('reading_edit_save')
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

  async function handleReinterpret() {
    if (!selectedId || isBusy || !profile) return

    trackEvent('reading_reinterpret')
    setError('')
    setLoading(true)
    try {
      const finalText = await askSajuInterpretation(profileAsSajuForm(profile), (text) =>
        setResult(text),
      )
      setResult(finalText)
      await updateReading(selectedId, finalText)
      setIsEditing(false)
      trackEvent('saju_generate_success', { user_type: 'member', mode: 'reinterpret' })
    } catch (err) {
      trackEvent('saju_generate_error', { user_type: 'member', mode: 'reinterpret' })
      setError(err.message || '사주 해석 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (isBusy) return

    const userType = session && profile ? 'member' : 'guest'
    let formPayload
    if (session && profile) {
      formPayload = profileAsSajuForm(profile)
    } else {
      const message = validateProfileForm(profileForm)
      if (message) {
        setError(message)
        return
      }
      formPayload = {
        name: profileForm.name.trim(),
        birthDate: profileForm.birthDate,
        birthTime: profileForm.birthTime,
        gender: profileForm.gender,
        calendarType: profileForm.calendarType,
      }
    }

    trackEvent('saju_submit', { user_type: userType })
    setError('')
    setResult('')
    setSelectedId(null)
    setIsEditing(false)

    setLoading(true)
    try {
      const finalText = await askSajuInterpretation(formPayload, (text) => setResult(text))
      setResult(finalText)

      if (session && profile) {
        const saved = await createReading(finalText)
        if (saved?.id) setSelectedId(saved.id)
      } else {
        writePendingReading({
          result: finalText,
          form: { ...profileForm, name: profileForm.name.trim() },
          savedAt: Date.now(),
        })
        requestAnimationFrame(() => {
          resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      }
      trackEvent('saju_generate_success', { user_type: userType })
    } catch (err) {
      trackEvent('saju_generate_error', { user_type: userType })
      setError(err.message || '사주 해석 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  function openLoginModal(source = 'unknown') {
    trackEvent('login_modal_open', { source })
    setShowLoginModal(true)
  }

  return {
    toast,
    session,
    authLoading,
    profile,
    profileLoading,
    profileForm,
    showProfileModal,
    showProfileEdit,
    showLoginModal,
    setShowLoginModal,
    openLoginModal,
    readingCount,
    result,
    setResult,
    loading,
    actionLoading,
    listLoading,
    error,
    profileError,
    readings,
    selectedId,
    isEditing,
    sidebarOpen,
    setSidebarOpen,
    resultRef,
    formRef,
    isViewing,
    isBusy,
    isGuest,
    isResultLocked,
    handleGoogleSignIn,
    handleSignOut,
    handleShareReading,
    applyProfileFormChange,
    handleSaveProfile,
    handleOpenProfileEdit,
    handleCancelProfileEdit,
    handleNewReading,
    handleSelectReading,
    handleStartEdit,
    handleCancelEdit,
    handleDeleteReading,
    handleSaveEdit,
    handleReinterpret,
    handleSubmit,
  }
}
