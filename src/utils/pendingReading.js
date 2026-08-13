const PENDING_READING_KEY = 'sajume_pending_reading'

export function readPendingReading() {
  try {
    const raw = sessionStorage.getItem(PENDING_READING_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.result) return null
    return parsed
  } catch {
    return null
  }
}

export function writePendingReading(payload) {
  try {
    sessionStorage.setItem(PENDING_READING_KEY, JSON.stringify(payload))
  } catch {
    // ignore quota / private mode failures
  }
}

export function clearPendingReading() {
  try {
    sessionStorage.removeItem(PENDING_READING_KEY)
  } catch {
    // ignore
  }
}
