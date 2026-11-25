import type { Task } from '../schemas/task'
import { accentChroma, accentLightness } from './progress.utils'
import { isTaskActive } from './tasks.utils'

/** hue shifts (in degrees) applied to the progress accent color, so the bubbles and the bouncing logo show several shades of the same color */
export const hueShiftSmall = 10
export const hueShiftBig = 20
export const hueOffsets = [0, hueShiftSmall, -hueShiftSmall, hueShiftBig, -hueShiftBig]

/** the pale version of the accent color is a bit lighter and much less saturated */
const paleLightnessGain = 10
/** about a third of the accent chroma */
const paleChroma = 0.063

/**
 * The accent color with its hue shifted, written in plain oklch so it works wherever oklch does, unlike the relative color syntax.
 * @param hue - the oklch hue of the accent color, from progressAccentHue
 * @param degrees - how many degrees to move the hue
 * @returns a css color
 */
export function shiftHue(hue: number, degrees: number) {
  return `oklch(${accentLightness}% ${accentChroma} ${hue + degrees})`
}

/**
 * A soft version of the shifted accent color, for the very calm bubbles behind the clock.
 * @param hue - the oklch hue of the accent color, from progressAccentHue
 * @param degrees - how many degrees to move the hue
 * @returns a paler, less saturated css color
 */
export function paleColor(hue: number, degrees: number) {
  return `oklch(${accentLightness + paleLightnessGain}% ${paleChroma} ${hue + degrees})`
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

const minutesInHour = 60

/**
 * Minutes elapsed since midnight for a time written HH:mm.
 * @param time - the time, like 07:30
 * @returns the minutes since midnight
 */
function minutesOfDay(time: string) {
  const [hours = '0', minutes = '0'] = time.split(':')
  return Number(hours) * minutesInHour + Number(minutes)
}

/**
 * Whether a date falls in the night, from the night start (included) to the night end (excluded).
 * @param date - the date to check, in the local time
 * @param nightStart - when the night starts, HH:mm
 * @param nightEnd - when the night ends, HH:mm, it can be before the start when the night crosses midnight
 * @returns true during the night, always false when start and end are the same time
 */
export function isNightTime(date: Date, nightStart: string, nightEnd: string) {
  const start = minutesOfDay(nightStart)
  const end = minutesOfDay(nightEnd)
  const now = date.getHours() * minutesInHour + date.getMinutes()
  if (start === end) return false
  if (start < end) return now >= start && now < end
  return now >= start || now < end
}
