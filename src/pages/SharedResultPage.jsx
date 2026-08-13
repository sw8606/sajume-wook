import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { supabase } from '../lib/supabase.js'
import { normalizeResult, profileMeta } from '../utils/format.js'
import { shareLink } from '../utils/share.js'
import Toast from '../components/common/Toast.jsx'
import '../styles/app.css'

export default function SharedResultPage() {
  const { shareToken } = useParams()
  const [reading, setReading] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')

      if (!shareToken) {
        setError('공유 링크가 올바르지 않습니다.')
        setLoading(false)
        return
      }

      const { data, error: rpcError } = await supabase.rpc('get_shared_reading', {
        p_token: shareToken,
      })

      if (cancelled) return

      if (rpcError) {
        console.error(rpcError)
        setError('결과를 불러오지 못했습니다.')
        setReading(null)
        setLoading(false)
        return
      }

      const row = Array.isArray(data) ? data[0] : data
      if (!row) {
        setError('공유된 사주 결과를 찾을 수 없습니다.')
        setReading(null)
      } else {
        setReading(row)
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [shareToken])

  async function handleShare() {
    const url = window.location.href
    const title = reading?.name ? `${reading.name}님의 사주` : '사주미 결과'

    await shareLink({
      title,
      text: '사주미에서 본 사주 결과예요.',
      url,
      onCopied: () => {
        setToast({ message: '링크를 복사했어요.' })
        setTimeout(() => setToast(null), 2200)
      },
      onError: () => {
        setToast({ message: '공유에 실패했어요. 주소창 링크를 복사해 주세요.' })
        setTimeout(() => setToast(null), 2500)
      },
    })
  }

  return (
    <div className="page page--auth page--shared">
      <Toast toast={toast} />

      <main className="app app--reading">
        <header className="shared-top">
          <p className="brand shared-top__brand">사주미</p>
          <p className="shared-top__note">공유된 사주 결과</p>
        </header>

        {loading && <p className="auth-shell__message">결과를 불러오는 중...</p>}

        {!loading && error && (
          <section className="result result--card">
            <p className="error">{error}</p>
            <Link className="submit" to="/">
              사주미 시작하기
            </Link>
          </section>
        )}

        {!loading && reading && (
          <section className="result result--card">
            <p className="result__eyebrow">공유된 해석</p>
            <h2>{reading.name ? `${reading.name}님의 사주` : '사주 해석'}</h2>
            <p className="result__meta">{profileMeta(reading)}</p>
            <div className="markdown">
              <ReactMarkdown>{normalizeResult(reading.result)}</ReactMarkdown>
            </div>
            <div className="result__actions">
              <button type="button" className="result__action" onClick={handleShare}>
                다시 공유하기
              </button>
              <Link className="result__action result__action--ghost" to="/">
                나도 사주 보기
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
