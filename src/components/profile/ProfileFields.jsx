export default function ProfileFields({ form, onChange, disabled }) {
  return (
    <>
      <div className="field">
        <label htmlFor="profile-name">이름</label>
        <input
          id="profile-name"
          type="text"
          value={form.name}
          onChange={(e) => onChange('name', e.target.value)}
          placeholder="이름을 입력하세요"
          autoComplete="name"
          disabled={disabled}
          required
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="profile-birthDate">생년월일</label>
          <input
            id="profile-birthDate"
            type="date"
            value={form.birthDate}
            onChange={(e) => onChange('birthDate', e.target.value)}
            disabled={disabled}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="profile-birthTime">
            태어난 시간 <span className="field__optional">선택</span>
          </label>
          <input
            id="profile-birthTime"
            type="time"
            value={form.birthTime}
            onChange={(e) => onChange('birthTime', e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="profile-gender">성별</label>
          <select
            id="profile-gender"
            value={form.gender}
            onChange={(e) => onChange('gender', e.target.value)}
            disabled={disabled}
            required
          >
            <option value="">선택하세요</option>
            <option value="male">남자</option>
            <option value="female">여자</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="profile-calendarType">양력 / 음력</label>
          <select
            id="profile-calendarType"
            value={form.calendarType}
            onChange={(e) => onChange('calendarType', e.target.value)}
            disabled={disabled}
          >
            <option value="solar">양력</option>
            <option value="lunar">음력</option>
          </select>
        </div>
      </div>
    </>
  )
}
