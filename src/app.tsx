import { useEffect } from 'react'
import { on, toastError } from 'shuutils'
import { AnimatedRoutes } from './components/animated-routes'
import { useHydration, usePersistence } from './db/use-persistence'
import { logger } from './utils/logger.utils'

function handleGlobalError(data: unknown) {
  if (data instanceof Error) return toastError(`global error catch : ${data.message}`)
  return toastError('global error catch : unknown error')
}

export function App() {
  useHydration()
  usePersistence()
  useEffect(() => {
    logger.info('app setup')
    on('error', handleGlobalError)
  }, [])
  return <AnimatedRoutes />
}
