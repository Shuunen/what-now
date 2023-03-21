/* eslint-disable @typescript-eslint/naming-convention */


import { check, daysAgoIso10, sleep } from 'shuutils'
import { test } from 'uvu'
import { equal } from 'uvu/assert'
import type { AirtableTask } from '../src/types'
import { state } from '../src/utils/state'
import { completeTask, daysRecurrence, daysSinceCompletion, dispatchTask, dispatchTasks, fetchList, isDataOlderThan, isTaskActive, loadTasks, pushToAirtable, toggleComplete, unCompleteTask } from '../src/utils/tasks'

const id = '42'
const today = daysAgoIso10(0)
const yesterday = daysAgoIso10(1)

const defaults = {
  name: 'a super task',
  once: 'day',
  done: false,
  completedOn: today,
  averageTime: 20,
}

function createTask (fields: Partial<typeof defaults> = defaults): AirtableTask {
  const { name, once, done, completedOn, averageTime } = { ...defaults, ...fields }
  return { id, createdTime: yesterday, fields: { name, once, done, 'completed-on': completedOn, 'average-time': averageTime } }
}

test('a task without completed on is active', function () {
  const task = createTask({ completedOn: '' })
  equal(isTaskActive(task), true)
  equal(task.fields.name, defaults.name)
})

test('a daily task completed yesterday is active', function () {
  const task = createTask({ once: 'day', completedOn: yesterday })
  equal(isTaskActive(task), true)
})

test('a weekly task completed yesterday is inactive', function () {
  const task = createTask({ once: 'week', completedOn: yesterday })
  equal(isTaskActive(task), false)
})

test('a monthly task completed 20 days ago is inactive', function () {
  const task = createTask({ once: 'month', completedOn: daysAgoIso10(20) })
  equal(isTaskActive(task), false)
})

test('a bi-monthly task completed 20 days ago is active', function () {
  const task = createTask({ once: '2-weeks', completedOn: daysAgoIso10(20) })
  equal(isTaskActive(task), true)
})

test('a bi-annual task completed 20 days ago is inactive', function () {
  const task = createTask({ once: '6-months', completedOn: daysAgoIso10(20) })
  equal(isTaskActive(task), false)
})

test('a non-handled once format result in a active task', function () {
  const task = createTask({ once: '3-paper', completedOn: yesterday })
  equal(isTaskActive(task), true)
})

test('days since completion is 0 is no date is provided', function () {
  const task = createTask({ once: 'day' })
  equal(daysSinceCompletion(task), 0)
})

test('a one time task is active by default', function () {
  const task = createTask({ once: 'yes' })
  equal(isTaskActive(task), true)
})

test('toggle complete A task update completed on date', async function () {
  const task = createTask({ once: 'day', completedOn: yesterday })
  await toggleComplete(task)
  equal(task.fields.done, false) // no a one time task, so we will have to do it again
  equal(task.fields['completed-on'], today)
})

test('toggle complete B one-time task mark it as done', async function () {
  const task = createTask({ once: 'yes' })
  await toggleComplete(task)
  equal(task.fields.done, true)
})

test('toggle complete C switches task active state', async function () {
  const task = createTask({ once: 'day', completedOn: yesterday })
  equal(isTaskActive(task), true, 'task is active')
  await toggleComplete(task)
  equal(task.fields.done, false, 'task is not done')
  equal(isTaskActive(task), false, 'task is no more active')
  await toggleComplete(task)
  equal(task.fields.done, false, 'task still not done')
  equal(isTaskActive(task), true, 'task is active again')
})

test('toggle complete D succeed with base & key in state', async function () {
  const task = createTask({ once: 'day', completedOn: yesterday })
  state.apiBase = 'app12345654987123'
  state.apiKey = 'key12345654987123'
  const hasSucceed = await toggleComplete(task)
  equal(hasSucceed, true)
})

test('toggle complete E fail without base & key in state', async function () {
  const task = createTask({ once: 'day', completedOn: yesterday })
  state.apiBase = ''
  state.apiKey = ''
  const hasSucceed = await toggleComplete(task)
  equal(hasSucceed, false)
})

test('fetch list via triggering isSetup without base & key in state', function () {
  state.apiBase = ''
  state.apiKey = ''
  state.isSetup = true
  equal(state.isSetup, true)
})

test('fetch list via fetchList with base & key in state', async function () {
  state.apiBase = 'app12345654987123'
  state.apiKey = 'key12345654987123'
  await fetchList()
  equal(state.isSetup, true)
})

test('data old check', async function () {
  state.tasksTimestamp = 0
  equal(isDataOlderThan(0), true, 'data is considered older if time 0')
  state.tasksTimestamp = Date.now()
  await sleep(100)
  equal(isDataOlderThan(50), true, 'data is older than 50ms after waiting 100ms')
})

test('update task with base & key in state', async function () {
  state.apiBase = 'app12345654987123'
  state.apiKey = 'key12345654987123'
  const task = createTask({ once: 'day', completedOn: yesterday })
  const hasBeenUpdated = await toggleComplete(task)
  equal(hasBeenUpdated, true)
})

test('update task without base & key in state', async function () {
  state.apiBase = ''
  state.apiKey = ''
  const task = createTask({ once: 'day', completedOn: yesterday })
  const hasBeenUpdated = await toggleComplete(task)
  equal(hasBeenUpdated, false)
})

test('dispatch tasks list', async function () {
  const task = createTask({ once: 'day', completedOn: yesterday })
  await dispatchTasks([task])
})

test('dispatch task A : cannot dispatch a daily task', async function () {
  const task = createTask({ once: 'day', completedOn: yesterday })
  const hasBeenUpdated = await dispatchTask(task)
  equal(hasBeenUpdated, false)
})

test('dispatch task B : can dispatch a weekly task completed yesterday', async function () {
  state.apiBase = 'app12345654987123'
  state.apiKey = 'key12345654987123'
  const task = createTask({ once: 'week', completedOn: yesterday })
  const hasBeenUpdated = await dispatchTask(task)
  equal(hasBeenUpdated, true)
})

test('dispatch task C : cannot dispatch a one time task', async function () {
  const task = createTask({ once: 'yes', completedOn: yesterday })
  const hasBeenUpdated = await dispatchTask(task)
  equal(hasBeenUpdated, false)
})

test('dispatch task D : cannot dispatch a weekly task completed 7 days ago', async function () {
  const task = createTask({ once: 'week', completedOn: daysAgoIso10(7) })
  const hasBeenUpdated = await dispatchTask(task)
  equal(hasBeenUpdated, false)
})

test('load tasks but there is fresh tasks in a setup state', async function () {
  state.isSetup = true
  state.tasksTimestamp = Date.now()
  state.tasks = [createTask({ once: 'day', completedOn: yesterday })]
  const hasLoadedTasks = await loadTasks()
  equal(hasLoadedTasks, false)
})

test('load tasks but state is not setup', async function () {
  state.isSetup = false
  const hasLoadedTasks = await loadTasks()
  equal(hasLoadedTasks, false)
})

check('days recurrence A', daysRecurrence(createTask({ once: 'day' })), 1)
check('days recurrence B', daysRecurrence(createTask({ once: 'week' })), 7)
check('days recurrence C', daysRecurrence(createTask({ once: 'month' })), 30)
check('days recurrence D', daysRecurrence(createTask({ once: 'year' })), 365)
check('days recurrence E', daysRecurrence(createTask({ once: 'yes' })), 0)
check('days recurrence F', daysRecurrence(createTask({ once: '3-days' })), 3)
check('days recurrence G', daysRecurrence(createTask({ once: '2-weeks' })), 14)
check('days recurrence H', daysRecurrence(createTask({ once: '2-months' })), 60)
check('days recurrence I', daysRecurrence(createTask({ once: '2-years' })), 730)

check('days since completion A', daysSinceCompletion(createTask({ completedOn: today })), 0)
check('days since completion B', daysSinceCompletion(createTask({ completedOn: yesterday })), 1)
check('days since completion C', daysSinceCompletion(createTask({ completedOn: daysAgoIso10(2) })), 2)

test('push to Airtable A', async function () {
  state.apiBase = 'app12345654987123'
  state.apiKey = 'key12345654987123'
  const hasPushed = await pushToAirtable(createTask({ once: 'day' }))
  equal(hasPushed, true)
})

check('complete A', completeTask(createTask({ once: 'day' })), true)

check('unComplete A', unCompleteTask(createTask({ once: 'week' })), true)

test.run()
