import { formatReadingDate } from '../../utils/format.js'

export default function Sidebar({
  open,
  onClose,
  session,
  profile,
  readings,
  selectedId,
  isViewing,
  showProfileEdit,
  listLoading,
  profileLoading,
  isBusy,
  onOpenProfileEdit,
  onSignOut,
  onNewReading,
  onSelectReading,
  onDeleteReading,
}) {
  return (
    <aside
      className={`sidebar${open ? ' sidebar--open' : ''}`}
      aria-label="저장된 사주 목록"
      aria-hidden={!open}
    >
      <div className="sidebar__header">
        <p className="sidebar__brand">명운당</p>
        <button type="button" className="sidebar__toggle" onClick={onClose} aria-label="사이드바 닫기">
          닫기
        </button>
      </div>

      <div className="sidebar__user">
        <p className="sidebar__user-email">{session.user.email}</p>
        {profile && <p className="sidebar__user-name">{profile.name}</p>}
        <div className="sidebar__user-actions">
          <button
            type="button"
            className="sidebar__profile"
            onClick={onOpenProfileEdit}
            disabled={isBusy || !profile}
          >
            프로필
          </button>
          <button type="button" className="sidebar__logout" onClick={onSignOut} disabled={isBusy}>
            로그아웃
          </button>
        </div>
      </div>

      <button
        type="button"
        className={`sidebar__new${!isViewing && !showProfileEdit ? ' sidebar__new--active' : ''}`}
        onClick={onNewReading}
        disabled={isBusy || !profile}
      >
        새 사주 만들기
      </button>

      <h2 className="sidebar__title">
        사주 기록
        {!listLoading && readings.length > 0 && (
          <span className="sidebar__count">{readings.length}</span>
        )}
      </h2>

      {listLoading || profileLoading ? (
        <p className="sidebar__empty">불러오는 중...</p>
      ) : readings.length === 0 ? (
        <p className="sidebar__empty">아직 기록이 없습니다. 새 사주로 시작해 보세요.</p>
      ) : (
        <ul className="sidebar__list">
          {readings.map((reading) => (
            <li key={reading.id} className="sidebar__row">
              <button
                type="button"
                className={`sidebar__item${selectedId === reading.id ? ' sidebar__item--active' : ''}`}
                onClick={() => onSelectReading(reading)}
                disabled={isBusy}
                aria-current={selectedId === reading.id ? 'true' : undefined}
              >
                <span className="sidebar__item-name">
                  {reading.name ? `${reading.name}님` : '사주 기록'}
                </span>
                <span className="sidebar__item-meta">{formatReadingDate(reading.created_at)}</span>
              </button>
              <button
                type="button"
                className="sidebar__delete"
                onClick={() => onDeleteReading(reading.id)}
                disabled={isBusy}
                aria-label="사주 기록 삭제"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
