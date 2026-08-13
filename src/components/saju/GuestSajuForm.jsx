import ProfileFields from '../profile/ProfileFields.jsx'

export default function GuestSajuForm({
  formRef,
  form,
  onChange,
  onSubmit,
  loading,
  actionLoading,
  onOpenLogin,
}) {
  return (
    <form className="panel" ref={formRef} onSubmit={onSubmit}>
      <ProfileFields form={form} onChange={onChange} disabled={loading || actionLoading} />
      <button className="submit" type="submit" disabled={loading}>
        {loading ? '풀이 중...' : '사주 보기'}
      </button>
      <p className="guest-auth">
        이미 계정이 있나요?{' '}
        <button
          type="button"
          className="guest-auth__link"
          onClick={onOpenLogin}
          disabled={actionLoading}
        >
          로그인
        </button>
      </p>
    </form>
  )
}
