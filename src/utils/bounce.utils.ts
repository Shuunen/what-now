import { nbMsInSecond } from 'shuutils'

/** position (px) and speed (px per second) of a bouncing item */
export type BounceState = { left: number; speedX: number; speedY: number; top: number }

export type BounceRoom = { height: number; width: number }

export type BounceResult = { hasHit: boolean; state: BounceState }

type AxisResult = { hasHit: boolean; position: number; speed: number }

/**
 * Bounce one axis : keeps the position inside [0, room] and flips the speed away from the wall that was reached.
 * @param position - the position after the move
 * @param speed - the current speed on this axis
 * @param room - how far the position can go, the container size minus the item size
 * @returns the corrected position and speed, and whether a wall was hit
 */
function bounceAxis(position: number, speed: number, room: number): AxisResult {
  if (room <= 0) return { hasHit: false, position: 0, speed }
  if (position < 0) return { hasHit: true, position: 0, speed: Math.abs(speed) }
  if (position > room) return { hasHit: true, position: room, speed: -Math.abs(speed) }
  return { hasHit: false, position, speed }
}

/**
 * Moves a bouncing item, like the DVD logo, for the time elapsed since the last frame.
 * @param state - the current position and speed of the item
 * @param elapsedMs - the time elapsed since the last step
 * @param room - how far the item can go, the container size minus the item size
 * @returns the new state, and whether the item hit a wall during this step
 */
export function stepBounce(state: BounceState, elapsedMs: number, room: BounceRoom): BounceResult {
  const seconds = elapsedMs / nbMsInSecond
  const horizontal = bounceAxis(state.left + state.speedX * seconds, state.speedX, room.width)
  const vertical = bounceAxis(state.top + state.speedY * seconds, state.speedY, room.height)
  return { hasHit: horizontal.hasHit || vertical.hasHit, state: { left: horizontal.position, speedX: horizontal.speed, speedY: vertical.speed, top: vertical.position } }
}
