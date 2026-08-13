export default function Toast({ toast }) {
  if (!toast) return null

  return (
    <div
      className={`toast${toast.leaving ? ' toast--out' : ''}`}
      role="status"
      aria-live="polite"
    >
      {typeof toast === 'string' ? toast : toast.message}
    </div>
  )
}
