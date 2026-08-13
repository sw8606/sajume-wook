import ReactMarkdown from 'react-markdown'
import { CHAR } from '../../constants/chars.js'
import { formMeta, profileMeta } from '../../utils/format.js'

export default function ResultSection({
  resultRef,
  loading,
  result,
  isViewing,
  isEditing,
  isGuest,
  isResultLocked,
  profile,
  profileForm,
  actionLoading,
  isBusy,
  onGoogleSignIn,
  onShare,
  onStartEdit,
  onDelete,
  onNewReading,
}) {
  if (!loading && !result) return null

  const displayName = profileForm?.name || profile?.name
  const meta = isGuest ? formMeta(profileForm) : profileMeta(profile)

  return (
    <section
      ref={resultRef}
      className={`result${isViewing || (!loading && result) ? ' result--card' : ''}${isResultLocked ? ' result--locked' : ''}`}
    >
      {isViewing ? (
        <>
          <p className="result__eyebrow">저장된 해석</p>
          <h2>{profile?.name ? `${profile.name}님의 사주` : '사주 해석'}</h2>
          <p className="result__meta">{profileMeta(profile)}</p>
        </>
      ) : (
        <>
          <p className="result__eyebrow">
            {loading ? '풀이 중' : isResultLocked ? '미리보기' : '방금 본 해석'}
          </p>
          <h2>
            {loading && !result
              ? '사주를 풀고 있어요'
              : displayName
                ? `${displayName}님의 사주`
                : '사주 해석'}
          </h2>
          {!loading && meta && <p className="result__meta">{meta}</p>}
        </>
      )}

      {loading && !result && (
        <>
          <div className="char-stage char-stage--analyzing" aria-hidden="true">
            <img src={CHAR.analyzing} alt="" className="char-img char-img--lg char-img--float" />
          </div>
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
        </>
      )}

      {result && (
        <div className={`result__preview${isResultLocked ? ' result__preview--locked' : ''}`}>
          <div className={`markdown${loading ? ' markdown--streaming' : ''}`}>
            <ReactMarkdown>{result}</ReactMarkdown>
            {loading && <span className="caret" aria-hidden="true" />}
          </div>
          {isResultLocked && (
            <div className="result__gate">
              <div className="result__gate-card">
                <p className="result__gate-title">이어서 전체 해석 보기</p>
                <p className="result__gate-lead">
                  Google로 로그인하면 나머지 해석을 모두 보고, 기록도 저장할 수 있어요.
                </p>
                <button
                  type="button"
                  className="login__google"
                  onClick={onGoogleSignIn}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Google로 이동 중...' : 'Google로 로그인하고 전체 보기'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isViewing && !isEditing && (
        <div className="result__actions">
          <button type="button" className="result__action" onClick={onShare} disabled={isBusy}>
            공유하기
          </button>
          <button type="button" className="result__action" onClick={onStartEdit} disabled={isBusy}>
            해석 수정
          </button>
          <button
            type="button"
            className="result__action result__action--danger"
            onClick={onDelete}
            disabled={isBusy}
          >
            {actionLoading ? '삭제 중...' : '삭제'}
          </button>
          <button
            type="button"
            className="result__action result__action--ghost"
            onClick={onNewReading}
            disabled={isBusy}
          >
            새 사주 만들기
          </button>
        </div>
      )}
    </section>
  )
}
