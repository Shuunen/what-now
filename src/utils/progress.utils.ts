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

const progressAccentColors = ['var(--color-error-accent)', 'var(--color-bad-accent)', 'var(--color-warning-accent)', 'var(--color-ok-accent)', 'var(--color-success-accent)']

// accent color for a given progress percent, shifting from red (low) to green (high)
export function progressAccentColor(percent: number) {
  const lastIndex = progressAccentColors.length - 1
  const index = Math.round((percent / nbPercentMax) * lastIndex)
  const color = progressAccentColors[index]
  invariant(color, `no accent color found for progress percent ${percent}`)
  return color
}
