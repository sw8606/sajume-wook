import { profileMeta } from '../../utils/format.js'
import ProfileFields from '../profile/ProfileFields.jsx'

export default function MemberSajuForm({
  formRef,
  profile,
  subjectForm,
  onChangeSubject,
  onFillFromProfile,
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

      <div className="subject-block">
        <p className="subject-block__eyebrow">사주 대상</p>
        <p className="subject-block__lead">
          다른 사람의 사주도 볼 수 있어요. 프로필은 그대로 유지됩니다.
        </p>
        <button
          type="button"
          className="subject-block__fill"
          onClick={onFillFromProfile}
          disabled={isBusy || !profile}
        >
          내 정보로 채우기
        </button>
        <ProfileFields form={subjectForm} onChange={onChangeSubject} disabled={loading || isBusy} />
      </div>

      <button className="submit" type="submit" disabled={loading}>
        {loading ? '풀이 중...' : '사주 보기'}
      </button>
    </form>
  )
}
