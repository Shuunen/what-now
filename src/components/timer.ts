import { div, nbSecondsInMinute, tw } from 'shuutils'
import type { AirtableTask } from '../types'
import { logger } from '../utils/logger.utils'
import { state, watchState } from '../utils/state.utils'
import { isTaskActive } from '../utils/tasks.utils'
import { credentials } from './credentials'

const timer = div(tw('app-timer fixed bottom-8 right-5 cursor-help select-none text-right text-5xl font-thin leading-10 text-gray-700'))

/**
 * Callback when tasks are loaded
 * @param tasks - the tasks
 */
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
function onTaskLoaded (tasks: AirtableTask[]) {
  logger.info('timer, on tasks loaded')
  // eslint-disable-next-line unicorn/no-array-reduce, @typescript-eslint/prefer-readonly-parameter-types
  const seconds = tasks.reduce((total, task) => isTaskActive(task) ? total + task.fields['average-time'] : total, 0)
  const minutes = Math.round(seconds / nbSecondsInMinute)
  timer.innerHTML = minutes > 0 ? `${minutes}<br>min` : ''
}

timer.addEventListener('dblclick', () => { credentials.classList.toggle('hidden') })

watchState('tasks', () => { onTaskLoaded(state.tasks) })

watchState('isSetup', () => { onTaskLoaded(state.tasks) })

export { timer }
