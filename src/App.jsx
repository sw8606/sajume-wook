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

function App() {
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [gender, setGender] = useState('')
  const [calendarType, setCalendarType] = useState('solar')

  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [error, setError] = useState('')

  const [readings, setReadings] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const resultRef = useRef(null)
  const formRef = useRef(null)
  const nameInputRef = useRef(null)

  const isViewing = Boolean(selectedId)

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

  useEffect(() => {
    loadReadings()
  }, [])

  async function saveReading(form, resultText) {
    const { data, error: saveError } = await supabase
      .from('saju_readings')
      .insert({
        name: form.name,
        birth_date: form.birthDate,
        birth_time: form.birthTime || null,
        gender: form.gender,
        calendar_type: form.calendarType,
        result: resultText,
      })
      .select('id, name, birth_date, birth_time, gender, calendar_type, result, created_at')
      .single()

    if (saveError) {
      throw saveError
    }

    await loadReadings()
    return data
  }

  function handleNewReading() {
    if (loading) return

    setSelectedId(null)
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
    if (loading) return

    setSelectedId(reading.id)
    setName(reading.name)
    setBirthDate(reading.birth_date ?? '')
    setBirthTime(formatBirthTime(reading.birth_time))
    setGender(reading.gender ?? '')
    setCalendarType(reading.calendar_type ?? 'solar')
    setResult(normalizeResult(reading.result))
    setError('')

    requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setResult('')
    setSelectedId(null)

    if (!name || !birthDate || !gender) {
      setError('이름, 생년월일, 성별은 꼭 입력해 주세요.')
      return
    }

    const form = { name, birthDate, birthTime, gender, calendarType }

    setLoading(true)
    try {
      const finalText = await askSajuInterpretation(form, (text) => setResult(text))
      const saved = await saveReading(form, finalText)
      if (saved?.id) {
        setSelectedId(saved.id)
      }
    } catch (err) {
      setError(err.message || '사주 해석 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

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

      {isViewing && (
        <button type="button" className="result__new" onClick={handleNewReading}>
          새 사주 만들기
        </button>
      )}
    </section>
  )

  return (
    <div className="page">
      <aside className="sidebar" aria-label="저장된 사주 목록">
        <p className="sidebar__brand">사주미</p>
        <button
          type="button"
          className={`sidebar__new${!isViewing ? ' sidebar__new--active' : ''}`}
          onClick={handleNewReading}
          disabled={loading}
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
              <li key={reading.id}>
                <button
                  type="button"
                  className={`sidebar__item${selectedId === reading.id ? ' sidebar__item--active' : ''}`}
                  onClick={() => handleSelectReading(reading)}
                  disabled={loading}
                  aria-current={selectedId === reading.id ? 'true' : undefined}
                >
                  <span className="sidebar__item-name">{reading.name}</span>
                  <span className="sidebar__item-meta">
                    {formatBirthDate(reading.birth_date)}
                  </span>
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

        {isViewing && resultSection}

        {!isViewing && (
          <form className="panel" ref={formRef} onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="name">이름</label>
              <input
                id="name"
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                autoComplete="name"
                disabled={loading}
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
                  disabled={loading}
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
                  disabled={loading}
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
                  disabled={loading}
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
                  disabled={loading}
                >
                  <option value="solar">양력</option>
                  <option value="lunar">음력</option>
                </select>
              </div>
            </div>

            <button className="submit" type="submit" disabled={loading}>
              {loading ? '풀이 중...' : '사주 보기'}
            </button>
          </form>
        )}

        {error && <p className="error">{error}</p>}

        {!isViewing && resultSection}
      </main>
    </div>
  )
}

export default App
