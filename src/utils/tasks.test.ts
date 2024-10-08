/* eslint-disable @typescript-eslint/naming-convention */
import { daysAgoIso10, sleep } from 'shuutils'
import { expect, it } from 'vitest'
import type { AirtableTask } from '../types'
import { state } from './state.utils'
import { byActive, completeTask, daysRecurrence, daysSinceCompletion, dispatchTask, dispatchTasks, fetchList, isDataOlderThan, isTaskActive, loadTasks, pushToAirtable, toggleComplete, unCompleteTask } from './tasks.utils'

const id = '42'
const today = daysAgoIso10(0)
const yesterday = daysAgoIso10(1)

const defaults = {
  averageTime: 20,
  completedOn: today,
  done: false,
  name: 'a super task',
  once: 'day',
}

/**
 * Create a task with default values
 * @param fields - fields to override
 * @returns a task
 */
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
function createTask (fields: Partial<typeof defaults> = defaults) {
  const { averageTime, completedOn, done, name, once } = { ...defaults, ...fields }
  return { createdTime: yesterday, fields: { 'average-time': averageTime, 'completed-on': completedOn, done, name, once }, id } satisfies AirtableTask
}

it('isTaskActive A : a task without completed on is active', () => {
  const task = createTask({ completedOn: '' })
  expect(isTaskActive(task)).toBe(true)
  expect(task.fields.name, defaults.name)
})

it('isTaskActive B : a daily task completed yesterday is active', () => {
  const task = createTask({ completedOn: yesterday, once: 'day' })
  expect(isTaskActive(task)).toBe(true)
})

it('isTaskActive C : a weekly task completed yesterday is inactive', () => {
  const task = createTask({ completedOn: yesterday, once: 'week' })
  expect(isTaskActive(task)).toBe(false)
})

it('isTaskActive D : a monthly task completed 20 days ago is inactive', () => {
  const task = createTask({ completedOn: daysAgoIso10(20), once: 'month' })
  expect(isTaskActive(task)).toBe(false)
})

it('isTaskActive E : a bi-monthly task completed 20 days ago is active', () => {
  const task = createTask({ completedOn: daysAgoIso10(20), once: '2-weeks' })
  expect(isTaskActive(task)).toBe(true)
})

it('isTaskActive F : a bi-annual task completed 20 days ago is inactive', () => {
  const task = createTask({ completedOn: daysAgoIso10(20), once: '6-months' })
  expect(isTaskActive(task)).toBe(false)
})

it('isTaskActive G : a non-handled once format result in a active task', () => {
  const task = createTask({ completedOn: yesterday, once: '3-paper' })
  expect(isTaskActive(task)).toBe(true)
})

it('isTaskActive H : days since completion is 0 is no date is provided', () => {
  const task = createTask({ once: 'day' })
  expect(daysSinceCompletion(task)).toBe(0)
})

it('isTaskActive I : a one time task is active by default', () => {
  const task = createTask({ once: 'yes' })
  expect(isTaskActive(task)).toBe(true)
})

it('isTaskActive J : a daily task completed today is inactive', () => {
  const task = createTask({ completedOn: today, once: 'day' })
  expect(isTaskActive(task)).toBe(false)
})

it('isTaskActive K : a daily task completed today can be considered active', () => {
  const task = createTask({ completedOn: today, once: 'day' })
  expect(isTaskActive(task, true)).toBe(true)
})

it('toggle complete A task update completed on date', async () => {
  const task = createTask({ completedOn: yesterday, once: 'day' })
  await toggleComplete(task)
  expect(task.fields.done).toBe(false) // no a one time task, so we will have to do it again
  expect(task.fields['completed-on'], today)
})

it('toggle complete B one-time task mark it as done', async () => {
  const task = createTask({ once: 'yes' })
  await toggleComplete(task)
  expect(task.fields.done).toBe(true)
})

it('toggle complete C switches task active state', async () => {
  const task = createTask({ completedOn: yesterday, once: 'day' })
  expect(isTaskActive(task), 'task is active').toBe(true)
  await toggleComplete(task)
  expect(task.fields.done, 'task is not done').toBe(false)
  expect(isTaskActive(task), 'task is no more active').toBe(false)
  await toggleComplete(task)
  expect(task.fields.done, 'task still not done').toBe(false)
  expect(isTaskActive(task), 'task is active again').toBe(true)
})

it('toggle complete D succeed with base & token in state', async () => {
  const task = createTask({ completedOn: yesterday, once: 'day' })
  state.apiBase = 'app12345654987123'
  state.apiToken = 'pat12345654987123azdazdzadazdzadaz465465468479649646azd46az465azdazd'
  const hasSucceed = await toggleComplete(task)
  expect(hasSucceed).toBe(true)
})

it('toggle complete E succeed without base & token in state', async () => {
  const task = createTask({ completedOn: yesterday, once: 'day' })
  state.apiBase = ''
  state.apiToken = ''
  const hasSucceed = await toggleComplete(task)
  expect(hasSucceed).toBe(true)
})

it('fetch list via triggering isSetup without base & token in state', () => {
  state.apiBase = ''
  state.apiToken = ''
  state.isSetup = true
  expect(state.isSetup).toBe(true)
})

it('fetch list via fetchList with base & token in state', async () => {
  state.apiBase = 'app12345654987123'
  state.apiToken = 'pat12345654987123azdazdzadazdzadaz465465468479649646azd46az465azdazd'
  await fetchList()
  expect(state.isSetup).toBe(true)
})

it('data old check', async () => {
  state.tasksTimestamp = 0
  expect(isDataOlderThan(0), 'data is considered older if time 0').toBe(true)
  state.tasksTimestamp = Date.now()
  await sleep(100)
  expect(isDataOlderThan(50), 'data is older than 50ms after waiting 100ms').toBe(true)
})

it('update task with base & token in state', async () => {
  state.apiBase = 'app12345654987123'
  state.apiToken = 'pat12345654987123azdazdzadazdzadaz465465468479649646azd46az465azdazd'
  const task = createTask({ completedOn: yesterday, once: 'day' })
  const hasBeenUpdated = await toggleComplete(task)
  expect(hasBeenUpdated).toBe(true)
})

it('update task without base & token in state', async () => {
  state.apiBase = ''
  state.apiToken = ''
  const task = createTask({ completedOn: yesterday, once: 'day' })
  const hasBeenUpdated = await toggleComplete(task)
  expect(hasBeenUpdated).toBe(true)
})

it('dispatch tasks list', async () => {
  const task = createTask({ completedOn: yesterday, once: 'day' })
  await dispatchTasks([task])
})

it('dispatch task A : cannot dispatch a daily task', async () => {
  const task = createTask({ completedOn: yesterday, once: 'day' })
  const hasBeenUpdated = await dispatchTask(task)
  expect(hasBeenUpdated).toBe(false)
})

it('dispatch task B : can dispatch a weekly task completed yesterday', async () => {
  state.apiBase = 'app12345654987123'
  state.apiToken = 'pat12345654987123azdazdzadazdzadaz465465468479649646azd46az465azdazd'
  const task = createTask({ completedOn: yesterday, once: 'week' })
  const hasBeenUpdated = await dispatchTask(task)
  expect(hasBeenUpdated).toBe(true)
})

it('dispatch task C : cannot dispatch a one time task', async () => {
  const task = createTask({ completedOn: yesterday, once: 'yes' })
  const hasBeenUpdated = await dispatchTask(task)
  expect(hasBeenUpdated).toBe(false)
})

it('dispatch task D : cannot dispatch a weekly task completed 7 days ago', async () => {
  const task = createTask({ completedOn: daysAgoIso10(7), once: 'week' })
  const hasBeenUpdated = await dispatchTask(task)
  expect(hasBeenUpdated).toBe(false)
})

it('load tasks but there is fresh tasks in a setup state', async () => {
  state.isSetup = true
  state.tasksTimestamp = Date.now()
  state.tasks = [createTask({ completedOn: yesterday, once: 'day' })]
  const hasLoadedTasks = await loadTasks()
  expect(hasLoadedTasks).toBe(false)
})

it('load tasks but state is not setup', async () => {
  state.isSetup = false
  const hasLoadedTasks = await loadTasks()
  expect(hasLoadedTasks).toBe(false)
})

it('days recurrence A', () => { expect(daysRecurrence(createTask({ once: 'day' }))).toBe(1) })
it('days recurrence B', () => { expect(daysRecurrence(createTask({ once: 'week' }))).toBe(7) })
it('days recurrence C', () => { expect(daysRecurrence(createTask({ once: 'month' }))).toBe(30) })
it('days recurrence D', () => { expect(daysRecurrence(createTask({ once: 'year' }))).toBe(365) })
it('days recurrence E', () => { expect(daysRecurrence(createTask({ once: 'yes' }))).toBe(0) })
it('days recurrence F', () => { expect(daysRecurrence(createTask({ once: '3-days' }))).toBe(3) })
it('days recurrence G', () => { expect(daysRecurrence(createTask({ once: '2-weeks' }))).toBe(14) })
it('days recurrence H', () => { expect(daysRecurrence(createTask({ once: '2-months' }))).toBe(60) })
it('days recurrence I', () => { expect(daysRecurrence(createTask({ once: '2-years' }))).toBe(730) })

it('days since completion A', () => { expect(daysSinceCompletion(createTask({ completedOn: today }))).toBe(0) })
it('days since completion B', () => { expect(daysSinceCompletion(createTask({ completedOn: yesterday }))).toBe(1) })
it('days since completion C', () => { expect(daysSinceCompletion(createTask({ completedOn: daysAgoIso10(2) }))).toBe(2) })

it('push to Airtable A', async () => {
  state.apiBase = 'app12345654987123'
  state.apiToken = 'pat12345654987123azdazdzadazdzadaz465465468479649646azd46az465azdazd'
  const hasPushed = await pushToAirtable(createTask({ once: 'day' }))
  expect(hasPushed).toBe(true)
})

it('complete A', async () => {
  expect(await completeTask(createTask({ once: 'day' }))).toBe(true)
})

it('unComplete A', async () => {
  expect(await unCompleteTask(createTask({ once: 'week' }))).toBe(true)
})

it('should sort tasks by active A', () => {
  const tasks = [
    createTask({ completedOn: today, name: 'b', once: 'day' }),
    createTask({ completedOn: yesterday, name: 'a', once: 'day' }),
    createTask({ name: 'c', once: 'month' }),
  ]
  const sortedTasks = Array.from(tasks).sort(byActive)
  expect(sortedTasks[0]?.fields.name).toBe('a')
})
