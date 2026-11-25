import { useSyncExternalStore } from 'react'

const landscapeQuery = '(orientation: landscape)'

function subscribe(onChange: () => void) {
  const media = globalThis.matchMedia(landscapeQuery)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function getSnapshot() {
  return globalThis.matchMedia(landscapeQuery).matches
}

/**
 * Tells whether the screen is wider than tall, and follows rotations and window resizes.
 * @returns true in landscape
 */
export function useIsLandscape() {
  return useSyncExternalStore(subscribe, getSnapshot)
}
