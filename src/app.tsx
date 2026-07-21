import { useEffect } from 'react'
import { on } from 'shuutils'
import { AnimatedRoutes } from './components/animated-routes'
import { OfflineWarning } from './components/offline-warning'
import { ToastViewportProvider } from './components/ui/toast-viewport'
import { useHydration, usePersistence } from './db/use-persistence'
import { setupPwa } from './pwa'
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
