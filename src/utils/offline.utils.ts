import { useEffect, useState } from 'react'

/**
 * tracks browser online/offline status via the online & offline window events
 * @returns whether the browser currently reports being offline
 */
export function useOfflineStatus() {
  const [isOffline, setIsOffline] = useState(() => !globalThis.navigator.onLine)
  useEffect(() => {
    const markOffline = () => setIsOffline(true)
    const markOnline = () => setIsOffline(false)
    globalThis.addEventListener('offline', markOffline)
    globalThis.addEventListener('online', markOnline)
    return () => {
      globalThis.removeEventListener('offline', markOffline)
      globalThis.removeEventListener('online', markOnline)
    }
  }, [])
  return isOffline
}
