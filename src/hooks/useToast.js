import { useEffect, useRef, useState } from 'react'

export function useToast() {
  const [toast, setToast] = useState(null)
  const toastTimerRef = useRef(null)
  const toastHideRef = useRef(null)

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      if (toastHideRef.current) clearTimeout(toastHideRef.current)
    }
  }, [])

  function showToast(message) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    if (toastHideRef.current) clearTimeout(toastHideRef.current)

    setToast({ message, leaving: false })

    toastTimerRef.current = setTimeout(() => {
      setToast((prev) => (prev ? { ...prev, leaving: true } : null))
      toastHideRef.current = setTimeout(() => {
        setToast(null)
        toastHideRef.current = null
      }, 280)
      toastTimerRef.current = null
    }, 2200)
  }

  return { toast, showToast }
}
