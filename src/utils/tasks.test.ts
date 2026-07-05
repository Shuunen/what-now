// oxlint-disable class-methods-use-this
import { daysAgoIso10, daysFromNow, functionReturningVoid, sleep } from 'shuutils'
import { addTask, localToRemoteTask } from './database.utils'
import { state } from './state.utils'
import {
  byActive,
  completeTask,
  daysRecurrence,
  daysSinceCompletion,
  dispatchTask,
  dispatchTasksAndUpdate,
  fetchList,
  isDataOlderThan,
  isTaskActive,
  loadTasks,
  minutesRemaining,
  taskMock,
  toggleComplete,
  unCompleteTask,
} from './tasks.utils'

const today = daysAgoIso10(0)
const yesterday = daysAgoIso10(1)

// oxlint-disable-next-line vitest/prefer-import-in-mock
vi.mock('appwrite', () => {
  class TablesDB {
    public constructor(client?: Client) {
      if (client) functionReturningVoid()
    }
    public async createRow({ databaseId, tableId, rowId, data }: { databaseId: string; tableId: string; rowId: string; data: object }) {
      await sleep(10)
      if (rowId === 'fail-trigger') throw new Error('fail-trigger')
      return { $id: rowId, databaseId, tableId, ...data }
    }
    public async listRows({ databaseId, tableId }: { databaseId: string; tableId: string }) {
      await sleep(10)
      if (databaseId === 'fail-trigger') throw new Error('fail-trigger')
      return { rows: [{ $id: databaseId, name: tableId }] }
    }
    public async updateRow({ databaseId, tableId, rowId, data }: { databaseId: string; tableId: string; rowId: string; data: object }) {
      await sleep(10)
      if (rowId === 'fail-trigger') throw new Error('fail-trigger')
      return { $id: rowId, databaseId, tableId, ...data }
    }
  }
  class Client {
    public constructor() {
      functionReturningVoid()
    }
    public setEndpoint(endpoint: string) {
      if (endpoint) functionReturningVoid()
      return this
    }
    public setProject(project: string) {
      if (project) functionReturningVoid()
      return this
    }
  }
  const Query = {
    limit: functionReturningVoid,
  }
  return { Client, Query, TablesDB }
})

describe('isTaskActive', () => {
  it('A : a task without completed on is active', () => {
    const task = taskMock({ completedOn: '' })
    expect(isTaskActive(task)).toBe(true)
    expect(task.name).toMatchInlineSnapshot(`"a super task"`)
  })

  it('B : a daily task completed yesterday is active', () => {
    const task = taskMock({ completedOn: yesterday, once: 'day' })
    expect(isTaskActive(task)).toBe(true)
  })

  it('C : a weekly task completed yesterday is inactive', () => {
    const task = taskMock({ completedOn: yesterday, once: 'week' })
    expect(isTaskActive(task)).toBe(false)
  })

  it('D : a monthly task completed 20 days ago is inactive', () => {
    const task = taskMock({ completedOn: daysAgoIso10(20), once: 'month' })
    expect(isTaskActive(task)).toBe(false)
  })

  it('E : a bi-monthly task completed 20 days ago is active', () => {
    const task = taskMock({ completedOn: daysAgoIso10(20), once: '2-weeks' })
    expect(isTaskActive(task)).toBe(true)
  })

  it('F : a bi-annual task completed 20 days ago is inactive', () => {
    const task = taskMock({ completedOn: daysAgoIso10(20), once: '6-months' })
    expect(isTaskActive(task)).toBe(false)
  })

  it('G : a non-handled once format result in a active task', () => {
    const task = taskMock({ completedOn: yesterday, once: '3-paper' })
    expect(isTaskActive(task)).toBe(true)
  })

  it('H : days since completion is 0 is no date is provided', () => {
    const task = taskMock({ once: 'day' })
    expect(daysSinceCompletion(task)).toBe(0)
  })

  it('I : a one time task is active by default', () => {
    const task = taskMock({ once: 'yes' })
    expect(isTaskActive(task)).toBe(true)
  })

  it('J : a daily task completed today is inactive', () => {
    const task = taskMock({ completedOn: today, once: 'day' })
    expect(isTaskActive(task)).toBe(false)
  })

  it('K : a daily task completed today can be considered active', () => {
    const task = taskMock({ completedOn: today, once: 'day' })
    expect(isTaskActive(task, true)).toBe(true)
  })

  it('L : a daily task that is done is inactive', () => {
    const task = taskMock({ completedOn: today, isDone: true, once: 'day' })
    expect(isTaskActive(task)).toBe(false)
  })
})

describe('toggleComplete', () => {
  it('A task update completed on date', async () => {
    const task = taskMock({ completedOn: yesterday, once: 'day' })
    await toggleComplete(task)
    expect(task.isDone).toBe(false) // no a one time task, so we will have to do it again
    expect(task.completedOn).toBe(today)
  })

  it('B one-time task mark it as done', async () => {
    const task = taskMock({ once: 'yes' })
    await toggleComplete(task)
    expect(task.isDone).toBe(true)
  })

  it('C switches task active state', async () => {
    const task = taskMock({ completedOn: yesterday, once: 'day' })
    expect(isTaskActive(task), 'task is active').toBe(true)
    await toggleComplete(task)
    expect(task.isDone, 'task is not done').toBe(false)
    expect(isTaskActive(task), 'task is no more active').toBe(false)
    await toggleComplete(task)
    expect(task.isDone, 'task still not done').toBe(false)
    expect(isTaskActive(task), 'task is active again').toBe(true)
  })

  it('D succeed with base & token in state', async () => {
    const task = taskMock({ completedOn: yesterday, once: 'day' })
    state.apiDatabase = 'app12345654987123'
    state.apiCollection = 'pat12345654987123azdazdzadazdzadaz465465468479649646azd46az465azdazd'
    const result = await toggleComplete(task)
    expect(result.ok).toBe(true)
  })

  it('E succeed without base & token in state', async () => {
    const task = taskMock({ completedOn: yesterday, once: 'day' })
    state.apiDatabase = ''
    state.apiCollection = ''
    const result = await toggleComplete(task)
    expect(result.ok).toBe(true)
  })
})

describe('fetchList', () => {
  it('via triggering isSetup without base & token in state', () => {
    state.apiDatabase = ''
    state.apiCollection = ''
    state.isSetup = true
    expect(state.isSetup).toBe(true)
  })

  it('via fetchList with base & token in state', async () => {
    state.apiDatabase = 'app12345654987123'
    state.apiCollection = 'pat12345654987123azdazdzadazdzadaz465465468479649646azd46az465azdazd'
    await fetchList('unit-test')
    expect(state.isSetup).toBe(true)
  })
})

describe('isDataOlderThan', () => {
  it('data old check', async () => {
    state.tasksTimestamp = 0
    expect(isDataOlderThan(0), 'data is considered older if time 0').toBe(true)
    state.tasksTimestamp = Date.now()
    await sleep(100)
    expect(isDataOlderThan(50), 'data is older than 50ms after waiting 100ms').toBe(true)
  })
})

describe('dispatchTasksAndUpdate', () => {
  it('dispatch tasks list', async () => {
    const task = taskMock({ completedOn: yesterday, once: 'day' })
    await expect(dispatchTasksAndUpdate([task])).resolves.toBeUndefined()
  })

  it('dispatch tasks list with mixed success and failure', async () => {
    const successTask = taskMock({ completedOn: yesterday, once: 'week' })
    const failureTask = taskMock({ completedOn: yesterday, once: 'day' })
    await expect(dispatchTasksAndUpdate([successTask, failureTask])).resolves.toBeUndefined()
  })
})

describe('dispatchTask', () => {
  it('A : cannot dispatch a daily task', () => {
    const task = taskMock({ completedOn: yesterday, once: 'day' })
    const result = dispatchTask(task)
    expect(result).toMatchInlineSnapshot(`
      Err {
        "error": "daily task, nothing to dispatch",
        "ok": false,
      }
    `)
  })

  it('B : can dispatch a weekly task completed yesterday', () => {
    const task = taskMock({ completedOn: yesterday, once: 'week' })
    const result = dispatchTask(task)
    expect(result.ok).toBe(true)
  })

  it('C : cannot dispatch a one time task', () => {
    const task = taskMock({ completedOn: yesterday, once: 'yes' })
    const result = dispatchTask(task)
    expect(result).toMatchInlineSnapshot(`
      Err {
        "error": "one-time task, cannot dispatch",
        "ok": false,
      }
    `)
  })

  it('D : cannot dispatch a weekly task completed 7 days ago', () => {
    const task = taskMock({ completedOn: daysAgoIso10(7), once: 'week' })
    const result = dispatchTask(task)
    expect(result).toMatchInlineSnapshot(`
      Err {
        "error": "task already dispatched",
        "ok": false,
      }
    `)
  })
})

describe('loadTasks', () => {
  it('A fresh tasks in a setup state', async () => {
    state.isSetup = true
    state.tasksTimestamp = Date.now()
    state.tasks = [taskMock({ completedOn: yesterday, once: 'day' })]
    await expect(loadTasks('unit-test')).resolves.toMatchInlineSnapshot(`
      Ok {
        "ok": true,
        "value": "tasks are fresh (now)",
      }
    `)
  })

  it('B state is not setup', async () => {
    state.isSetup = false
    await expect(loadTasks('unit-test')).resolves.toMatchInlineSnapshot(`
      Err {
        "error": "not setup, cannot load tasks",
        "ok": false,
      }
    `)
  })

  it('C failed to fetch tasks', async () => {
    state.apiDatabase = 'fail-trigger'
    state.isSetup = true
    state.tasksTimestamp = daysFromNow(-1).getTime()
    await expect(loadTasks('unit-test')).resolves.toMatchInlineSnapshot(`
      Err {
        "error": [Error: fail-trigger],
        "ok": false,
      }
    `)
  })

  it('D should successfully fetch and load tasks', async () => {
    state.isSetup = true
    state.tasks = []
    state.isLoading = true
    state.tasksTimestamp = daysFromNow(-1).getTime()
    state.apiDatabase = 'test-database'
    state.apiCollection = 'test-collection'
    await expect(loadTasks('unit-test')).resolves.toMatchInlineSnapshot(`
      Ok {
        "ok": true,
        "value": "tasks loaded",
      }
    `)
    expect(state.isLoading).toBe(false)
    expect(state.tasks.length).toBeGreaterThanOrEqual(0)
  })
})

describe('daysRecurrence', () => {
  it('A', () => {
    expect(daysRecurrence(taskMock({ once: 'day' }))).toBe(1)
  })
  it('B', () => {
    expect(daysRecurrence(taskMock({ once: 'week' }))).toBe(7)
  })
  it('C', () => {
    expect(daysRecurrence(taskMock({ once: 'month' }))).toBe(30)
  })
  it('D', () => {
    expect(daysRecurrence(taskMock({ once: 'year' }))).toBe(365)
  })
  it('E', () => {
    expect(daysRecurrence(taskMock({ once: 'yes' }))).toBe(0)
  })
  it('F', () => {
    expect(daysRecurrence(taskMock({ once: '3-days' }))).toBe(3)
  })
  it('G', () => {
    expect(daysRecurrence(taskMock({ once: '2-weeks' }))).toBe(14)
  })
  it('H', () => {
    expect(daysRecurrence(taskMock({ once: '2-months' }))).toBe(60)
  })
  it('I', () => {
    expect(daysRecurrence(taskMock({ once: '2-years' }))).toBe(730)
  })
})

describe('daysSinceCompletion', () => {
  it('A', () => {
    expect(daysSinceCompletion(taskMock({ completedOn: today }))).toBe(0)
  })
  it('B', () => {
    expect(daysSinceCompletion(taskMock({ completedOn: yesterday }))).toBe(1)
  })
  it('C', () => {
    expect(daysSinceCompletion(taskMock({ completedOn: daysAgoIso10(2) }))).toBe(2)
  })
})

describe('completeTask', () => {
  it('A', async () => {
    const task = taskMock({ once: 'day' })
    const result = await completeTask(task)
    expect(result.ok).toBe(true)
  })
})

describe('unCompleteTask', () => {
  it('A', async () => {
    const task = taskMock({ once: 'week' })
    const result = await unCompleteTask(task)
    expect(result.ok).toBe(true)
  })
})

describe('byActive', () => {
  it('should sort tasks by active A', () => {
    const tasks = [taskMock({ completedOn: today, name: 'b', once: 'day' }), taskMock({ completedOn: yesterday, name: 'a', once: 'day' }), taskMock({ name: 'c', once: 'month' })]
    const sortedTasks = Array.from(tasks).toSorted(byActive)
    expect(sortedTasks[0]?.name).toBe('a')
  })
})

describe('addTask', () => {
  it('A success', async () => {
    const task = localToRemoteTask(taskMock({ name: 'nice task', once: 'day' }))
    const result = await addTask(task)
    expect(result.ok).toBe(true)
  })

  it('B failing', async () => {
    const task = localToRemoteTask(taskMock({ name: 'fail-trigger', once: 'day' }))
    const result = await addTask(task)
    expect(result).toMatchInlineSnapshot(`
      Err {
        "error": [Error: fail-trigger],
        "ok": false,
      }
    `)
  })
})

describe('minutesRemaining', () => {
  it('A should return 0 for empty array', () => {
    const result = minutesRemaining([])
    expect(result).toMatchInlineSnapshot('0')
  })

  it('B should return total minutes for all active tasks', () => {
    const tasks = [
      taskMock({ completedOn: yesterday, minutes: 30, once: 'day' }), // active
      taskMock({ completedOn: daysAgoIso10(8), minutes: 15, once: 'week' }), // active
      taskMock({ completedOn: '', minutes: 45, once: 'yes' }), // active (one-time, not done)
    ]
    const result = minutesRemaining(tasks)
    expect(result).toMatchInlineSnapshot('90')
  })

  it('C should exclude inactive tasks', () => {
    const tasks = [
      taskMock({ completedOn: today, minutes: 30, once: 'day' }), // inactive (completed today)
      taskMock({ completedOn: yesterday, minutes: 15, once: 'week' }), // inactive (weekly, completed yesterday)
      taskMock({ completedOn: yesterday, minutes: 45, once: 'day' }), // active (daily, completed yesterday)
    ]
    const result = minutesRemaining(tasks)
    expect(result).toMatchInlineSnapshot('45')
  })

  it('D should exclude done tasks', () => {
    const tasks = [
      taskMock({ completedOn: yesterday, isDone: true, minutes: 30, once: 'day' }), // inactive (done)
      taskMock({ completedOn: yesterday, isDone: false, minutes: 15, once: 'day' }), // active
    ]
    const result = minutesRemaining(tasks)
    expect(result).toMatchInlineSnapshot('15')
  })

  it('E should handle mixed active and inactive tasks', () => {
    const tasks = [
      taskMock({ completedOn: yesterday, minutes: 10, once: 'day' }), // active
      taskMock({ completedOn: today, isDone: true, minutes: 20, once: 'day' }), // inactive (done)
      taskMock({ completedOn: yesterday, minutes: 30, once: 'week' }), // inactive (weekly, too recent)
      taskMock({ completedOn: daysAgoIso10(35), minutes: 40, once: 'month' }), // active (monthly, old enough)
      taskMock({ completedOn: '', minutes: 50, once: 'yes' }), // active (one-time, not done)
    ]
    const result = minutesRemaining(tasks)
    expect(result).toMatchInlineSnapshot('100')
  })

  it('F should handle tasks with zero minutes', () => {
    const tasks = [
      taskMock({ completedOn: yesterday, minutes: 0, once: 'day' }), // active but 0 minutes
      taskMock({ completedOn: yesterday, minutes: 25, once: 'day' }), // active
    ]
    const result = minutesRemaining(tasks)
    expect(result).toMatchInlineSnapshot('25')
  })
})
