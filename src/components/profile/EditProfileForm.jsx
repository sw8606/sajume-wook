import ProfileFields from './ProfileFields.jsx'

export default function EditProfileForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  profileError,
  actionLoading,
}) {
  return (
    <form className="panel panel--edit" onSubmit={onSubmit}>
      <p className="panel__eyebrow">프로필</p>
      <h2 className="panel__title">내 정보 수정</h2>
      <p className="panel__lead">변경한 정보는 이후 사주 풀이에 바로 반영됩니다.</p>
      <ProfileFields form={form} onChange={onChange} disabled={actionLoading} />
      {profileError && <p className="error">{profileError}</p>}
      <button className="submit" type="submit" disabled={actionLoading}>
        {actionLoading ? '저장 중...' : '프로필 저장'}
      </button>
      <button
        className="submit submit--ghost"
        type="button"
        onClick={onCancel}
        disabled={actionLoading}
      >
        취소
      </button>
    </form>
  )
}
