import { profileMeta } from '../../utils/format.js'

export default function EditReadingForm({
  profile,
  result,
  onChangeResult,
  onSubmit,
  onReinterpret,
  onCancel,
  loading,
  actionLoading,
  isBusy,
}) {
  return (
    <form className="panel panel--edit" onSubmit={onSubmit}>
      <p className="panel__eyebrow">기록 수정</p>
      <h2 className="panel__title">{profile?.name ? `${profile.name}님의 사주` : '사주 수정'}</h2>
      <p className="result__meta result__meta--panel">{profileMeta(profile)}</p>

      <div className="field field--textarea">
        <label htmlFor="result">사주 해석</label>
        <textarea
          id="result"
          className="field__textarea"
          value={result}
          onChange={(e) => onChangeResult(e.target.value)}
          rows={10}
          disabled={isBusy}
          placeholder="사주 해석 내용"
        />
      </div>

      <button className="submit" type="submit" disabled={isBusy}>
        {actionLoading ? '저장 중...' : '해석 저장'}
      </button>
      <button
        className="submit submit--secondary"
        type="button"
        onClick={onReinterpret}
        disabled={isBusy}
      >
        {loading ? '풀이 중...' : '프로필로 다시 풀이'}
      </button>
      <button className="submit submit--ghost" type="button" onClick={onCancel} disabled={isBusy}>
        취소
      </button>
    </form>
  )
}
