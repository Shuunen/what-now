import { dateIso10, daysAgoIso10, Nb } from 'shuutils'
import { state } from '../state'
import { airtableGet, airtablePatch, airtableUrl, type AirtableTask } from './airtable'

const enum Unit {
  Day = 'day',
  Week = 'week',
  Month = 'month',
  Year = 'year',
}

export function daysRecurrence (task: AirtableTask): number {
  // eslint-disable-next-line security/detect-unsafe-regex, unicorn/no-unsafe-regex
  const matches = /(?<quantity>\d{1,3})?-?(?<unit>day|month|week|year)/u.exec(task.fields.once)
  if (matches === null) return 0
  const quantity = matches.groups?.quantity ?? '1'
  const unit = matches.groups?.unit as Unit // eslint-disable-line @typescript-eslint/consistent-type-assertions
  const number = Number.parseInt(quantity, 10)
  if (unit === Unit.Day) return number
  if (unit === Unit.Week) return number * Nb.DaysInWeek
  if (unit === Unit.Month) return number * Nb.DaysInMonth
  return number * Nb.DaysInYear // Unit.Year case
}

export function daysSinceCompletion (task: AirtableTask): number {
  const today = dateIso10(new Date())
  const todayTimestamp = new Date(today).getTime()
  const completedOnTimestamp = new Date(task.fields['completed-on']).getTime()
  return ((todayTimestamp - completedOnTimestamp) / Nb.MsInDay)
}

export async function pushToAirtable (task: AirtableTask): Promise<boolean> {
  console.log('update task')
  const url = airtableUrl(state.apiBase, state.apiKey, `tasks/${task.id}`)
  if (url === '') return false
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const data = { fields: { 'completed-on': task.fields['completed-on'], 'done': task.fields.done } }
  const response = await airtablePatch(url, data)
  return response.error === undefined
}

export async function completeTask (task: AirtableTask): Promise<boolean> {
  task.fields['completed-on'] = dateIso10(new Date()) // task is complete for today
  task.fields.done = task.fields.once === 'yes' // but it also can be done totally if it was a one time job
  return await pushToAirtable(task)
}

export async function unCompleteTask (task: AirtableTask): Promise<boolean> {
  // to un-complete, need to put the last completed on just before the required number of days
  task.fields['completed-on'] = daysAgoIso10(daysRecurrence(task))
  task.fields.done = false
  return await pushToAirtable(task)
}

export function isTaskActive (task: AirtableTask): boolean {
  if (task.fields['completed-on'] === '' || task.fields.once === 'yes') return true
  const recurrence = daysRecurrence(task)
  const days = daysSinceCompletion(task)
  return days >= recurrence
}

export async function fetchList (): Promise<AirtableTask[]> {
  console.log('fetch list')
  const url = airtableUrl(state.apiBase, state.apiKey, 'tasks')
  state.statusInfo = 'Loading tasks, please wait...'
  const { records } = await airtableGet(url)
  state.statusInfo = ''
  state.tasksTimestamp = Date.now()
  /* c8 ignore next */
  return (records ?? []).filter(task => isTaskActive(task))
}

export function isDataOlderThan (milliseconds: number): boolean {
  if (state.tasksTimestamp === 0) return true
  const age = Date.now() - state.tasksTimestamp
  const minutes = Math.round(age / Nb.MsInMinute)
  /* c8 ignore next */
  if (minutes > 0) console.log('last activity', minutes, 'minute(s) ago')
  return age >= milliseconds
}

export async function loadTasks (): Promise<boolean> {
  if (!state.isSetup) return false
  if (state.tasks.length > 0 && !isDataOlderThan(Nb.Ten * Nb.MsInMinute)) {
    console.log('tasks are fresh')
    return false
  }
  const tasks = await fetchList()
  console.log('found', tasks.length, 'task(s)')
  state.isLoading = false
  state.tasks = tasks
  return true
}

export async function dispatchTask (task: AirtableTask, index = 0): Promise<boolean> {
  if (['day', 'yes'].includes(task.fields.once)) return false
  const delay = daysRecurrence(task)
  const position = index % delay
  const completionDate = daysAgoIso10((Nb.Before * position) + delay)
  if (completionDate === task.fields['completed-on']) return false
  task.fields['completed-on'] = completionDate
  return await pushToAirtable(task)
}

export async function dispatchTasks (tasks: AirtableTask[]): Promise<void> {
  console.log('dispatch tasks')
  await Promise.all(tasks.map(async (task, index) => await dispatchTask(task, index)))
  await loadTasks()
}

export async function toggleComplete (task: AirtableTask): Promise<boolean> {
  if (isTaskActive(task)) return await completeTask(task)
  return await unCompleteTask(task)
}
