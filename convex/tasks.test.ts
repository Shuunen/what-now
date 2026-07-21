import { convexTest } from 'convex-test'
import { api } from './_generated/api'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

type TaskArgFields = Partial<{ completedOn: string; createdOn: string; deletedOn: string; id: string; isDone: boolean; minutes: number; name: string; once: string; reason: string; syncedAt: string; updatedOn: string }>

/**
 * Build full `upsertTask` args, defaulting every field so each test only states what it cares about.
 * @param fields - fields to override on top of the defaults
 * @returns a complete set of `upsertTask` mutation args
 */
function taskArgs(fields: TaskArgFields = {}) {
  return {
    completedOn: '',
    createdOn: '',
    deletedOn: '',
    id: 'task-1',
    isDone: false,
    minutes: 0,
    name: 'a task',
    once: 'day',
    syncedAt: '',
    updatedOn: '',
    ...fields,
  }
}

describe('health', () => {
  it('A reports ok and the current schema version', async () => {
    const t = convexTest(schema, modules)
    const result = await t.query(api.tasks.health, {})
    expect(result).toStrictEqual({ ok: true, schemaVersion: 1 })
  })
})

describe('upsertTask / getAllTasks', () => {
  it('A inserts a brand-new task by app id', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.tasks.upsertTask, taskArgs({ id: 'task-1', name: 'water plants' }))
    const tasks = await t.query(api.tasks.getAllTasks, {})
    expect(tasks).toHaveLength(1)
    expect(tasks[0]).toMatchObject({ id: 'task-1', name: 'water plants' })
  })

  it('B patches the existing row matched by app id instead of inserting a duplicate', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.tasks.upsertTask, taskArgs({ id: 'task-1', name: 'water plants' }))
    await t.mutation(api.tasks.upsertTask, taskArgs({ id: 'task-1', name: 'water plants twice' }))
    const tasks = await t.query(api.tasks.getAllTasks, {})
    expect(tasks).toHaveLength(1)
    expect(tasks[0]?.name).toBe('water plants twice')
  })

  it('C returns soft-deleted tasks too, so a stale local copy cannot resurrect them', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.tasks.upsertTask, taskArgs({ deletedOn: '2025-01-01T00:00:00.000Z', id: 'task-1' }))
    const tasks = await t.query(api.tasks.getAllTasks, {})
    expect(tasks).toHaveLength(1)
    expect(tasks[0]?.deletedOn).toBe('2025-01-01T00:00:00.000Z')
  })

  it('D strips Convex-internal fields, returning only the app-shape Task fields', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.tasks.upsertTask, taskArgs({ id: 'task-1' }))
    const tasks = await t.query(api.tasks.getAllTasks, {})
    expect(tasks[0]).not.toHaveProperty('_id')
    expect(tasks[0]).not.toHaveProperty('_creationTime')
  })
})

describe('clearAllTasks', () => {
  it('A removes every task in the deployment', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.tasks.upsertTask, taskArgs({ id: 'task-1' }))
    await t.mutation(api.tasks.upsertTask, taskArgs({ id: 'task-2' }))
    await t.mutation(api.tasks.clearAllTasks, {})
    const tasks = await t.query(api.tasks.getAllTasks, {})
    expect(tasks).toHaveLength(0)
  })

  it('B is a no-op on an already-empty deployment', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.tasks.clearAllTasks, {})
    const tasks = await t.query(api.tasks.getAllTasks, {})
    expect(tasks).toHaveLength(0)
  })
})
