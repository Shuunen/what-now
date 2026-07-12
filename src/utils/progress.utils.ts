import { nbPercentMax } from 'shuutils'
import type { Task } from '../types'
import { state } from './state.utils'
import { isTaskActive, minutesRemaining } from './tasks.utils'

export function webhookPayload(progress = 0) {
  const activeTasks = state.tasks.filter(task => isTaskActive(task))
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

// accent color for a given progress percent, shifting from orange (low) to green (high), matching the "Dark Home" design
export function progressAccentColor(percent: number) {
  /* oxlint-disable no-magic-numbers */
  const hue = 22 + 128 * (percent / nbPercentMax)
  /* oxlint-enable no-magic-numbers */
  return `oklch(72% 0.18 ${hue})`
}
