import ProfileFields from '../profile/ProfileFields.jsx'

export default function ProfileModal({
  open,
  form,
  onChange,
  onSubmit,
  profileError,
  actionLoading,
}) {
  if (!open) return null

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
      <div className="modal__panel">
        <p className="modal__eyebrow">환영합니다</p>
        <h2 id="profile-modal-title">프로필을 등록해 주세요</h2>
        <p className="modal__lead">
          한 번만 입력하면 다음부터는 저장된 정보로 바로 사주를 볼 수 있습니다.
        </p>
        <form className="panel" onSubmit={(e) => onSubmit(e, { closeEdit: true })}>
          <ProfileFields form={form} onChange={onChange} disabled={actionLoading} />
          {profileError && <p className="error">{profileError}</p>}
          <button className="submit" type="submit" disabled={actionLoading}>
            {actionLoading ? '저장 중...' : '저장하고 시작하기'}
          </button>
        </form>
      </div>
    </div>
  )
}
