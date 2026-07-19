import { registerSW } from 'virtual:pwa-register'
import { logger } from './utils/logger.utils'

export function setupPwa(): void {
  registerSW({
    immediate: true,
    onRegisterError: (error: unknown) => logger.error('failed to register service worker', error),
  })
}
