import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Tells when nobody touched the screen for a while.
 * @param delayMs - how long without any touch or key press before the user is considered idle, a key press also wakes an idle user
 * @param isEnabled - when false, the user is never idle and no listener is added
 * @returns whether the user is idle, and a function to wake up (not idle anymore, with the timer restarted)
 */
export function useIdle(delayMs: number, isEnabled: boolean) {
  const [isIdle, setIsIdle] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const arm = useCallback(() => {
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setIsIdle(true), delayMs)
  }, [delayMs])
  const wake = useCallback(() => {
    setIsIdle(false)
    arm()
  }, [arm])
  useEffect(() => {
    if (!isEnabled) return undefined
    arm()
    globalThis.addEventListener('pointerdown', arm, { passive: true })
    globalThis.addEventListener('keydown', wake, { passive: true })
    return () => {
      clearTimeout(timeoutRef.current)
      globalThis.removeEventListener('pointerdown', arm)
      globalThis.removeEventListener('keydown', wake)
    }
  }, [arm, isEnabled, wake])
  // never idle while disabled, whatever the last known state was
  return { isIdle: isEnabled && isIdle, wake }
}
