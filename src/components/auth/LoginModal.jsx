export default function LoginModal({ open, onClose, onGoogleSignIn, actionLoading, error }) {
  if (!open) return null

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="login-modal-title">
      <div className="modal__panel">
        <p className="modal__eyebrow">계정</p>
        <h2 id="login-modal-title">로그인하고 기록 저장</h2>
        <p className="modal__lead">
          Google로 로그인하면 사주 결과를 저장하고 언제든 다시 볼 수 있습니다.
        </p>
        <button
          type="button"
          className="login__google"
          onClick={onGoogleSignIn}
          disabled={actionLoading}
        >
          {actionLoading ? 'Google로 이동 중...' : 'Google로 계속하기'}
        </button>
        <button
          type="button"
          className="submit submit--ghost"
          onClick={onClose}
          disabled={actionLoading}
        >
          나중에 하기
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  )
}
