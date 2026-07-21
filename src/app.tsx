import { useEffect } from 'react'
import { on } from 'shuutils'
import { AnimatedRoutes } from './components/animated-routes'
import { OfflineWarning } from './components/offline-warning'
import { ToastViewportProvider } from './components/ui/toast-viewport'
import { useHydration, usePersistence } from './db/use-persistence'
import { useSync } from './db/use-sync'
import { setupPwa } from './pwa'
import { useAppStore } from './store/use-app-store'
import { toastError } from './store/use-toast-store'
import { logger } from './utils/logger.utils'
import { useOfflineStatus } from './utils/offline.utils'

function handleGlobalError(data: unknown) {
  if (data instanceof Error) return toastError(`global error catch : ${data.message}`)
  return toastError('global error catch : unknown error')
}

export function App() {
  useHydration()
  usePersistence()
  const isOffline = useOfflineStatus()
  // called once here (not from Settings/the offline indicator directly) so only one Convex
  // connection ever exists ; its status is mirrored into the store so those other components can
  // read it without each opening their own connection
  const syncStatus = useSync()
  const setSyncStatus = useAppStore(state => state.setSyncStatus)
  useEffect(() => {
    setSyncStatus(syncStatus)
  }, [setSyncStatus, syncStatus])
  useEffect(() => {
    logger.info('app setup')
    on('error', handleGlobalError)
  }, [])
  useEffect(setupPwa, [])
  return (
    <ToastViewportProvider>
      <OfflineWarning isOffline={isOffline} />
      <AnimatedRoutes />
    </ToastViewportProvider>
  )
}
