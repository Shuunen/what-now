import { useEffect } from 'react'
import { logger } from '../utils/logger.utils'

const touchScreenQuery = '(pointer: coarse)'

/**
 * Goes fullscreen on the first touch of the screen, on touch devices like phones, tablets and the Echo Show.
 * Browsers only allow fullscreen after a user gesture, so it can't be done when the page opens. It's tried once per page load,
 * so a user leaving fullscreen on purpose is not sent back into it, and it's skipped with a mouse where fullscreen would be intrusive.
 */
export function useAutoFullscreen() {
  useEffect(() => {
    if (!globalThis.matchMedia(touchScreenQuery).matches || typeof document.documentElement.requestFullscreen !== 'function') return undefined
    async function enterFullscreen() {
      if (document.fullscreenElement) return
      try {
        await document.documentElement.requestFullscreen()
      } catch (error) {
        logger.info('fullscreen refused', error)
      }
    }
    const handleClick = () => void enterFullscreen()
    globalThis.addEventListener('click', handleClick, { once: true })
    return () => globalThis.removeEventListener('click', handleClick)
  }, [])
}
