import { invariant } from 'es-toolkit'
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

const progressAccentColors = ['var(--color-error)', 'var(--color-bad)', 'var(--color-warning)', 'var(--color-ok)', 'var(--color-success)']

// accent color for a given progress percent, shifting from red (low) to green (high)
export function progressAccentColor(percent: number) {
  const lastIndex = progressAccentColors.length - 1
  const index = Math.round((percent / nbPercentMax) * lastIndex)
  const color = progressAccentColors[index]
  invariant(color, `no accent color found for progress percent ${percent}`)
  return color
}
