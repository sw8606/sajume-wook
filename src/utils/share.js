export function getShareUrl(token) {
  if (!token) return ''
  return `${window.location.origin}/result/${token}`
}

export async function shareLink({ title, text, url, onShared, onCopied, onError }) {
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url })
      onShared?.()
      return
    }
    await navigator.clipboard.writeText(url)
    onCopied?.()
  } catch (err) {
    if (err?.name === 'AbortError') return
    try {
      await navigator.clipboard.writeText(url)
      onCopied?.()
    } catch {
      onError?.()
    }
  }
}

