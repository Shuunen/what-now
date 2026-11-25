import { useSyncExternalStore } from 'react'
import { logger } from '../utils/logger.utils'

function subscribe(onChange: () => void) {
  document.addEventListener('fullscreenchange', onChange)
  return () => document.removeEventListener('fullscreenchange', onChange)
}

function getSnapshot() {
  return Boolean(document.fullscreenElement)
}

async function toggleFullscreen() {
  try {
    await (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())
  } catch (error) {
    logger.info('fullscreen change refused', error)
  }
}

/**
 * The fullscreen state of the page, with a way to toggle it.
 * @returns whether the page is fullscreen, whether the browser supports fullscreen (not the case of Safari on iPhone), and the function that toggles it
 */
export function useFullscreen() {
  const isFullscreen = useSyncExternalStore(subscribe, getSnapshot)
  const isSupported = typeof document.documentElement.requestFullscreen === 'function'
  return { isFullscreen, isSupported, toggleFullscreen }
}
