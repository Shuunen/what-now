import { div, Nb, tw } from 'shuutils'
import { state, watchState } from '../state'
import type { AirtableTask } from '../utils/airtable'
import { logger } from '../utils/logger'
import { dispatchTasks, isTaskActive } from '../utils/tasks'

const timer = div(tw('app-timer fixed bottom-8 right-5 text-right text-5xl font-thin leading-10 text-gray-700'))

function onTaskLoaded (tasks: AirtableTask[]): void {
  logger.info('timer, on tasks loaded')
  // eslint-disable-next-line unicorn/no-array-reduce
  const seconds = tasks.reduce((total, task) => isTaskActive(task) ? total + task.fields['average-time'] : total, 0)
  const minutes = Math.round(seconds / Nb.SecondsInMinute)
  timer.innerHTML = minutes > 0 ? `${minutes}<br>min` : ''
}

timer.addEventListener('dblclick', () => { void dispatchTasks(state.tasks) })

watchState('tasks', () => { onTaskLoaded(state.tasks) })

watchState('isSetup', () => { onTaskLoaded(state.tasks) })

export { timer }
