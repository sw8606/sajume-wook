import { profileMeta } from '../../utils/format.js'

export default function MemberSajuForm({
  formRef,
  profile,
  onSubmit,
  onEditProfile,
  loading,
  isBusy,
}) {
  return (
    <form className="panel" ref={formRef} onSubmit={onSubmit}>
      <div className="profile-card">
        <p className="profile-card__eyebrow">내 프로필</p>
        <h2 className="profile-card__name">{profile.name}</h2>
        <p className="profile-card__meta">{profileMeta(profile)}</p>
        <button type="button" className="profile-card__edit" onClick={onEditProfile} disabled={isBusy}>
          프로필 수정
        </button>
      </div>

      <button className="submit" type="submit" disabled={loading}>
        {loading ? '풀이 중...' : '사주 보기'}
      </button>
    </form>
  )
}
