const MEASUREMENT_ID = 'G-8JX9VF0J87'

function canTrack() {
  return typeof window !== 'undefined' && typeof window.gtag === 'function'
}

/** GA4 커스텀 이벤트 */
export function trackEvent(eventName, params = {}) {
  if (!canTrack()) return
  window.gtag('event', eventName, params)
}

/** SPA 라우트 변경 시 페이지뷰 */
export function trackPageView(path) {
  if (!canTrack()) return
  window.gtag('config', MEASUREMENT_ID, {
    page_path: path,
  })
}
