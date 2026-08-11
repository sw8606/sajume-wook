// useState: React에서 변하는 데이터(상태)를 저장할 때 사용합니다.
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { askSajuInterpretation } from './gemini.js'
import './App.css'

function App() {
  // 입력 상태
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [gender, setGender] = useState('')
  const [calendarType, setCalendarType] = useState('solar')

  // API 관련 상태
  const [result, setResult] = useState('') // 사주 해석 결과
  const [loading, setLoading] = useState(false) // 요청 중인지 여부
  const [error, setError] = useState('') // 에러 메시지

  // 버튼 클릭 → Gemini에게 사주 해석 요청
  async function handleSubmit(e) {
    e.preventDefault() // form 제출 시 페이지 새로고침 막기
    setError('')
    setResult('')

    // 간단한 필수값 확인
    if (!name || !birthDate || !gender) {
      setError('이름, 생년월일, 성별은 꼭 입력해 주세요.')
      return
    }

    setLoading(true)
    try {
      // onChunk: 글자가 생성될 때마다 result를 바로 갱신합니다.
      await askSajuInterpretation(
        {
          name,
          birthDate,
          birthTime,
          gender,
          calendarType,
        },
        (text) => setResult(text),
      )
    } catch (err) {
      // 실패 원인을 화면에 보여 줍니다.
      setError(err.message || '사주 해석 중 오류가 발생했습니다.')
    } finally {
      // 성공/실패와 관계없이 로딩을 끝냅니다.
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <main className="app">
        <header className="hero">
          <p className="brand">사주미</p>
          <h1>나를 담은 사주 보기</h1>
          <p className="hero__lead">
            이름과 생년월일을 입력하면, 차분한 시선으로 오늘의 나를 풀어 드립니다.
          </p>
        </header>

        <form className="panel" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="name">이름</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
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
              />
            </div>

            <div className="field">
              <label htmlFor="birthTime">태어난 시간</label>
              <input
                id="birthTime"
                type="time"
                value={birthTime}
                onChange={(e) => setBirthTime(e.target.value)}
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

        {error && <p className="error">{error}</p>}

        {/* 로딩 중이거나 결과가 있으면 해석 영역을 보여 줍니다 */}
        {(loading || result) && (
          <section className="result">
            <h2>사주 해석</h2>

            {/* 아직 첫 글자가 오기 전 → 스켈레톤 */}
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

            {/* 글자가 실시간으로 쌓이면 마크다운으로 표시 */}
            {result && (
              <div className={`markdown${loading ? ' markdown--streaming' : ''}`}>
                <ReactMarkdown>{result}</ReactMarkdown>
                {loading && <span className="caret" aria-hidden="true" />}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

export default App
