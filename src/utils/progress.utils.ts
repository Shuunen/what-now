import { invariant } from 'es-toolkit'
import { nbPercentMax } from 'shuutils'
import type { Task } from '../schemas/task'
import { isTaskActive, minutesRemaining } from './tasks.utils'

export function webhookPayload(tasks: Task[], progress = 0) {
  const activeTasks = tasks.filter(task => isTaskActive(task))
  const firstTask = activeTasks.at(0)
  const minutes = minutesRemaining(activeTasks)
  return `progress=${progress}&remaining=${minutes}&nextTask=${firstTask?.name}`
}

export function computeProgressPercent(tasks: Task[]) {
  const total = tasks.length
  if (total === 0) return 0
  const remaining = tasks.filter(task => isTaskActive(task)).length
  return nbPercentMax - Math.round((remaining / total) * nbPercentMax)
}

/**
 * Human-friendly status text for a given progress percent.
 * @param percent - the completion percent (0-100)
 * @returns the encouraging status text
 */
export function progressText(percent = 0) {
  /* oxlint-disable no-magic-numbers */
  if (!percent) return 'Nothing done... yet'
  if (percent <= 25) return 'Amuse-bouche : check'
  if (percent <= 33) return 'Now we are talking'
  if (percent <= 50) return 'Halfway to heaven'
  if (percent <= 75) return 'Final chapter for today'
  if (percent < 100) return 'Lasts tasks remaining !'
  return 'You made it, well done dude :)'
  /* oxlint-enable no-magic-numbers */
}

/** lightness (%) and chroma of every accent color, as defined in styles.css, a test checks they still match */
export const accentLightness = 72
export const accentChroma = 0.18

/** the accent colors from red (low progress) to green (high progress), with the hue each one has in styles.css */
const progressAccents = [
  { color: 'var(--color-error-accent)', hue: 22 },
  { color: 'var(--color-bad-accent)', hue: 54 },
  { color: 'var(--color-warning-accent)', hue: 86 },
  { color: 'var(--color-ok-accent)', hue: 118 },
  { color: 'var(--color-success-accent)', hue: 150 },
]

function progressAccent(percent: number) {
  const lastIndex = progressAccents.length - 1
  const accent = progressAccents[Math.round((percent / nbPercentMax) * lastIndex)]
  invariant(accent, `no accent color found for progress percent ${percent}`)
  return accent
}

// accent color for a given progress percent, shifting from red (low) to green (high)
export function progressAccentColor(percent: number) {
  return progressAccent(percent).color
}

/**
 * The hue (degrees) of the accent color for a given progress percent, for the places that need to shift it.
 * @param percent - the progress percent, 0 to 100
 * @returns the oklch hue of the accent color
 */
export function progressAccentHue(percent: number) {
  return progressAccent(percent).hue
}
