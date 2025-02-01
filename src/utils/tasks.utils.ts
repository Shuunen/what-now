/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable jsdoc/require-jsdoc */
import { dateIso10, daysAgoIso10, nbBefore, nbDaysInMonth, nbDaysInWeek, nbDaysInYear, nbMsInDay, nbMsInMinute, readableTimeAgo } from 'shuutils'
import type { Task } from '../types'
import { logger } from './logger.utils'
import { state } from './state.utils'
import { getTasks, updateTask } from './database.utils'

const enum Unit {
  Day = 'day',
  Month = 'month',
  Week = 'week',
  Year = 'year',
}

export function daysRecurrence (task: Task) {
  const matches = /(?<quantity>\d{1,3})?-?(?<unit>day|month|week|year)/u.exec(task.once)
  if (matches === null) return 0
  const quantity = matches.groups?.quantity ?? '1'
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unsafe-type-assertion
  const unit = matches.groups?.unit as Unit
  const number = Number.parseInt(quantity, 10)
  if (unit === Unit.Day) return number
  if (unit === Unit.Week) return number * nbDaysInWeek
  if (unit === Unit.Month) return number * nbDaysInMonth
  return number * nbDaysInYear // Unit.Year case
}

export function daysSinceCompletion (task: Task) {
  const today = dateIso10(new Date())
  const todayTimestamp = new Date(today).getTime()
  const completedOnTimestamp = new Date(task.completedOn).getTime()
  return ((todayTimestamp - completedOnTimestamp) / nbMsInDay)
}

export async function completeTask (task: Task) {
  task.completedOn = dateIso10(new Date()) // task is complete for today
  task.isDone = task.once === 'yes' // but it also can be done totally if it was a one time job
  return updateTask(task)
}

export async function unCompleteTask (task: Task) {
  // to un-complete, need to put the last completed on just before the required number of days
  task.completedOn = daysAgoIso10(daysRecurrence(task))
  task.isDone = false
  return updateTask(task)
}

export function isTaskActive (task: Task, shouldIncludeCompletedToday = false) {
  if (task.isDone) return false
  if (task.completedOn === '' || task.once === 'yes') return true
  const recurrence = daysRecurrence(task)
  const days = daysSinceCompletion(task)
  const isActive = (shouldIncludeCompletedToday && days === 0) || days >= recurrence
  return isActive
}

export function byActive (taskA: Task, taskB: Task) {
  const isAActive = isTaskActive(taskA)
  const isBActive = isTaskActive(taskB)
  if (isAActive && !isBActive) return -1
  if (!isAActive && isBActive) return 1
  return 0
}

export async function fetchList () {
  logger.info('fetch list')
  state.statusInfo = 'Loading tasks, please wait...'
  const list = await getTasks()
  state.statusInfo = ''
  state.tasksTimestamp = Date.now()
  return list.filter(task => isTaskActive(task, true)).sort(byActive)
}

export function isDataOlderThan (milliseconds: number) {
  if (!state.tasksTimestamp) return true
  const age = Date.now() - state.tasksTimestamp
  const minutes = Math.round(age / nbMsInMinute)
  /* c8 ignore next */
  if (minutes > 0) logger.info('last activity', minutes, 'minute(s) ago')
  return age >= milliseconds
}

export async function loadTasks () {
  if (!state.isSetup) return false
  if (state.tasks.length > 0 && !isDataOlderThan(Number(nbMsInMinute))) {
    logger.info(`tasks are fresh (${readableTimeAgo(Date.now() - state.tasksTimestamp)})`)
    return false
  }
  const tasks = await fetchList()
  logger.info('found', tasks.length, 'task(s)')
  state.isLoading = false // eslint-disable-line require-atomic-updates
  state.tasks = tasks // eslint-disable-line require-atomic-updates
  return true
}

export async function dispatchTask (task: Task, index = 0) {
  if (['day', 'yes'].includes(task.once)) return false
  const delay = daysRecurrence(task)
  const position = index % delay
  const completionDate = daysAgoIso10((nbBefore * position) + delay)
  if (completionDate === task.completedOn) return false
  task.completedOn = completionDate
  return updateTask(task)
}

export async function dispatchTasks (tasks: Task[]) {
  logger.info('dispatch tasks')
  await Promise.all(tasks.map(async (task, index) => dispatchTask(task, index)))
  state.tasksTimestamp = 0 // invalidate cache
  await loadTasks()
}

export async function toggleComplete (task: Task) {
  if (isTaskActive(task)) return completeTask(task)
  return unCompleteTask(task)
}

