import { invariant } from 'es-toolkit'
import { useEffect, useRef } from 'react'
import { stepBounce } from '../utils/bounce.utils'

/** horizontal speed of the item, as a share of the container's larger side per second */
const speedX = 0.09
/** vertical speed of the item, as a share of the container's larger side per second, a bit slower to avoid a perfect diagonal */
const speedY = 0.065
/** where the item starts, as a share of the container size */
const startShare = 0.1
/** longest step taken in one frame, so a tab that was in the background does not teleport the item */
const maxStepMs = 100

/**
 * Makes an item bounce inside its container, like the DVD logo.
 * @param onHit - called each time the item hits a wall
 * @returns the refs to attach to the container and to the item
 */
export function useBounce(onHit: () => void) {
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRef = useRef<HTMLDivElement>(null)
  const onHitRef = useRef(onHit)
  useEffect(() => {
    onHitRef.current = onHit
  }, [onHit])
  useEffect(() => {
    const { current: container } = containerRef
    const { current: item } = itemRef
    invariant(container && item, 'bounce container and item must be attached')
    const { clientHeight, clientWidth } = container
    const reference = Math.max(clientWidth, clientHeight)
    let state = { left: clientWidth * startShare, speedX: reference * speedX, speedY: reference * speedY, top: clientHeight * startShare }
    let lastTime = globalThis.performance.now()
    let frame = 0
    function place() {
      invariant(item, 'bounce item must be attached')
      item.style.transform = `translate3d(${state.left}px, ${state.top}px, 0)`
    }
    function tick(time: number) {
      invariant(container && item, 'bounce container and item must be attached')
      const room = { height: container.clientHeight - item.offsetHeight, width: container.clientWidth - item.offsetWidth }
      const { hasHit, state: nextState } = stepBounce(state, Math.min(time - lastTime, maxStepMs), room)
      lastTime = time
      state = nextState
      place()
      if (hasHit) onHitRef.current()
      frame = globalThis.requestAnimationFrame(tick)
    }
    place()
    if (globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    frame = globalThis.requestAnimationFrame(tick)
    return () => globalThis.cancelAnimationFrame(frame)
  }, [])
  return { containerRef, itemRef }
}
