import type { Task } from '../schemas/task'
import { isTaskActive } from './tasks.utils'

/** hue shifts (in degrees) applied to the progress accent color, so the bubbles and the bouncing logo show several shades of the same color */
export const hueShiftSmall = 10
export const hueShiftBig = 20
export const hueOffsets = [0, hueShiftSmall, -hueShiftSmall, hueShiftBig, -hueShiftBig]

/**
 * Shift the hue of a css color.
 * @param color - any css color, like a `var(--color-ok-accent)`
 * @param degrees - how many degrees to move the hue
 * @returns a css color
 */
export function shiftHue(color: string, degrees: number) {
  return `oklch(from ${color} l c calc(h + ${degrees}))`
}

/**
 * A soft version of a shifted color, for the very calm bubbles behind the clock.
 * @param color - any css color
 * @param degrees - how many degrees to move the hue
 * @returns a paler, less saturated css color
 */
export function paleColor(color: string, degrees: number) {
  return `oklch(from ${color} calc(l + 0.1) calc(c * 0.35) calc(h + ${degrees}))`
}

/**
 * How many tasks are still to do.
 * @param tasks - the tasks of the day
 * @returns the number of active tasks
 */
export function countRemaining(tasks: Task[]) {
  return tasks.filter(task => isTaskActive(task)).length
}

/**
 * The time to show on the clock, in 24h.
 * @param date - the date to format
 * @param locale - the locale to use, the device one by default
 * @returns for example 09:05
 */
export function formatClockTime(date: Date, locale?: string) {
  return date.toLocaleTimeString(locale, { hour: '2-digit', hourCycle: 'h23', minute: '2-digit' })
}

/**
 * The day to show under the clock.
 * @param date - the date to format
 * @param locale - the locale to use, the device one by default
 * @returns for example "mercredi 25 novembre"
 */
export function formatClockDate(date: Date, locale?: string) {
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', weekday: 'long' })
}
