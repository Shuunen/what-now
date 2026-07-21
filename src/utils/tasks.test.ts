import { daysAgoIso10 } from 'shuutils'
import { buildOnce, byActive, completeTask, createTask, daysRecurrence, daysSinceCompletion, deleteTask, isTaskActive, mergeTask, minutesRemaining, parseOnce, taskMock, toggleComplete, unCompleteTask } from './tasks.utils'

const today = daysAgoIso10(0)
const yesterday = daysAgoIso10(1)

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

describe('completeTask', () => {
  it('A marks a recurring task completed today without finishing it', () => {
    const task = taskMock({ completedOn: yesterday, once: 'day' })
    const updated = completeTask(task)
    expect(updated.completedOn).toBe(today)
    expect(updated.isDone).toBe(false)
  })

  it('B marks a one-time task as done', () => {
    const updated = completeTask(taskMock({ once: 'yes' }))
    expect(updated.isDone).toBe(true)
  })

  it('C does not mutate the input task', () => {
    const task = taskMock({ completedOn: yesterday, once: 'day' })
    completeTask(task)
    expect(task.completedOn).toBe(yesterday)
  })

  it('D bumps syncedAt but leaves updatedOn untouched (CRITICAL regression : quote attribution reads updatedOn, not syncedAt)', () => {
    const task = taskMock({ completedOn: yesterday, once: 'day', updatedOn: 'never-touch-me' })
    const updated = completeTask(task)
    expect(updated.updatedOn).toBe('never-touch-me')
    expect(updated.syncedAt).not.toBe('')
  })
})

describe('unCompleteTask', () => {
  it('A pushes the completion date before the recurrence window', () => {
    const updated = unCompleteTask(taskMock({ completedOn: today, once: 'week' }))
    expect(updated.isDone).toBe(false)
    expect(isTaskActive(updated)).toBe(true)
  })

  it('B bumps syncedAt but leaves updatedOn untouched (CRITICAL regression : same as completeTask)', () => {
    const task = taskMock({ completedOn: today, once: 'week', updatedOn: 'never-touch-me' })
    const updated = unCompleteTask(task)
    expect(updated.updatedOn).toBe('never-touch-me')
    expect(updated.syncedAt).not.toBe('')
  })
})

describe('deleteTask', () => {
  it('A stamps deletedOn and syncedAt without mutating the input', () => {
    const task = taskMock()
    const updated = deleteTask(task)
    expect(updated.deletedOn).not.toBe('')
    expect(updated.syncedAt).not.toBe('')
    expect(task.deletedOn).toBe('')
  })

  it('B a deleted task is never active, regardless of completion state', () => {
    const task = taskMock({ completedOn: '', deletedOn: new Date().toISOString(), once: 'day' })
    expect(isTaskActive(task)).toBe(false)
  })
})

describe('mergeTask', () => {
  it('A the task with the later syncedAt wins', () => {
    const older = taskMock({ name: 'older', syncedAt: '2026-01-01T00:00:00.000Z' })
    const newer = taskMock({ name: 'newer', syncedAt: '2026-01-02T00:00:00.000Z' })
    expect(mergeTask(older, newer).name).toBe('newer')
    expect(mergeTask(newer, older).name).toBe('newer')
  })

  it('B a later delete wins over an earlier update (delete propagates)', () => {
    const updated = taskMock({ deletedOn: '', name: 'updated', syncedAt: '2026-01-01T00:00:00.000Z' })
    const deleted = taskMock({ deletedOn: '2026-01-02T00:00:00.000Z', name: 'deleted', syncedAt: '2026-01-02T00:00:00.000Z' })
    const winner = mergeTask(updated, deleted)
    expect(winner.deletedOn).not.toBe('')
  })

  it('C a later update wins over an earlier delete (update resurrects)', () => {
    const deleted = taskMock({ deletedOn: '2026-01-01T00:00:00.000Z', name: 'deleted', syncedAt: '2026-01-01T00:00:00.000Z' })
    const updated = taskMock({ deletedOn: '', name: 'updated', syncedAt: '2026-01-02T00:00:00.000Z' })
    const winner = mergeTask(deleted, updated)
    expect(winner.deletedOn).toBe('')
  })

  it('D on an exact tie, prefers the non-deleted side so data is never silently dropped', () => {
    const alive = taskMock({ deletedOn: '', name: 'alive', syncedAt: '2026-01-01T00:00:00.000Z' })
    const dead = taskMock({ deletedOn: '2026-01-01T00:00:00.000Z', name: 'dead', syncedAt: '2026-01-01T00:00:00.000Z' })
    expect(mergeTask(alive, dead).deletedOn).toBe('')
    expect(mergeTask(dead, alive).deletedOn).toBe('')
  })

  it('D2 on an exact tie with matching deletion state, falls back to the first argument deterministically', () => {
    const first = taskMock({ deletedOn: '', name: 'first', syncedAt: '2026-01-01T00:00:00.000Z' })
    const second = taskMock({ deletedOn: '', name: 'second', syncedAt: '2026-01-01T00:00:00.000Z' })
    expect(mergeTask(first, second).name).toBe('first')
  })

  it('E throws on mismatched task ids', () => {
    const a = taskMock({ id: 'a' })
    const b = taskMock({ id: 'b' })
    expect(() => mergeTask(a, b)).toThrow('mergeTask called with mismatched task ids "a" vs "b"')
  })
})

describe('toggleComplete', () => {
  it('A completes an active task', () => {
    const task = taskMock({ completedOn: yesterday, once: 'day' })
    const updated = toggleComplete(task)
    expect(updated.isDone).toBe(false)
    expect(updated.completedOn).toBe(today)
    expect(isTaskActive(updated)).toBe(false)
  })

  it('B un-completes an inactive task', () => {
    const task = taskMock({ completedOn: today, once: 'day' })
    const updated = toggleComplete(task)
    expect(isTaskActive(updated)).toBe(true)
  })
})

describe('daysRecurrence', () => {
  it('A', () => {
    expect(daysRecurrence('day')).toBe(1)
  })
  it('B', () => {
    expect(daysRecurrence('week')).toBe(7)
  })
  it('C', () => {
    expect(daysRecurrence('month')).toBe(30)
  })
  it('D', () => {
    expect(daysRecurrence('year')).toBe(365)
  })
  it('E', () => {
    expect(daysRecurrence('yes')).toBe(0)
  })
  it('F', () => {
    expect(daysRecurrence('3-days')).toBe(3)
  })
  it('G', () => {
    expect(daysRecurrence('2-weeks')).toBe(14)
  })
  it('H', () => {
    expect(daysRecurrence('2-months')).toBe(60)
  })
  it('I', () => {
    expect(daysRecurrence('2-years')).toBe(730)
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

describe('byActive', () => {
  it('should sort tasks by active A', () => {
    const tasks = [taskMock({ completedOn: today, name: 'b', once: 'day' }), taskMock({ completedOn: yesterday, name: 'a', once: 'day' }), taskMock({ name: 'c', once: 'month' })]
    const sortedTasks = Array.from(tasks).toSorted(byActive)
    expect(sortedTasks[0]?.name).toBe('a')
  })
})

describe('minutesRemaining', () => {
  it('A should return 0 for empty array', () => {
    expect(minutesRemaining([])).toMatchInlineSnapshot('0')
  })

  it('B should return total minutes for all active tasks', () => {
    const tasks = [taskMock({ completedOn: yesterday, minutes: 30, once: 'day' }), taskMock({ completedOn: daysAgoIso10(8), minutes: 15, once: 'week' }), taskMock({ completedOn: '', minutes: 45, once: 'yes' })]
    expect(minutesRemaining(tasks)).toMatchInlineSnapshot('90')
  })

  it('C should exclude inactive tasks', () => {
    const tasks = [taskMock({ completedOn: today, minutes: 30, once: 'day' }), taskMock({ completedOn: yesterday, minutes: 15, once: 'week' }), taskMock({ completedOn: yesterday, minutes: 45, once: 'day' })]
    expect(minutesRemaining(tasks)).toMatchInlineSnapshot('45')
  })

  it('D should exclude done tasks', () => {
    const tasks = [taskMock({ completedOn: yesterday, isDone: true, minutes: 30, once: 'day' }), taskMock({ completedOn: yesterday, isDone: false, minutes: 15, once: 'day' })]
    expect(minutesRemaining(tasks)).toMatchInlineSnapshot('15')
  })

  it('E should handle mixed active and inactive tasks', () => {
    const tasks = [
      taskMock({ completedOn: yesterday, minutes: 10, once: 'day' }),
      taskMock({ completedOn: today, isDone: true, minutes: 20, once: 'day' }),
      taskMock({ completedOn: yesterday, minutes: 30, once: 'week' }),
      taskMock({ completedOn: daysAgoIso10(35), minutes: 40, once: 'month' }),
      taskMock({ completedOn: '', minutes: 50, once: 'yes' }),
    ]
    expect(minutesRemaining(tasks)).toMatchInlineSnapshot('100')
  })

  it('F should handle tasks with zero minutes', () => {
    const tasks = [taskMock({ completedOn: yesterday, minutes: 0, once: 'day' }), taskMock({ completedOn: yesterday, minutes: 25, once: 'day' })]
    expect(minutesRemaining(tasks)).toMatchInlineSnapshot('25')
  })
})

describe('createTask', () => {
  it('A builds an active task with defaults and a generated id', () => {
    const task = createTask({ name: 'do the dishes' })
    expect(task).toMatchObject({ completedOn: '', isDone: false, minutes: 0, name: 'do the dishes', once: 'day' })
    expect(task.id.length).toBeGreaterThan(0)
    expect(isTaskActive(task)).toBe(true)
  })
  it('B honors provided fields', () => {
    const task = createTask({ minutes: 15, name: 'weekly review', once: 'week', reason: 'stay on top' })
    expect(task.minutes).toBe(15)
    expect(task.once).toBe('week')
    expect(task.reason).toBe('stay on top')
    expect(task.id.length).toBeGreaterThan(0)
  })
  it('C generates unique ids across calls', () => {
    expect(createTask({ name: 'a' }).id).not.toBe(createTask({ name: 'b' }).id)
  })
})

describe('buildOnce', () => {
  it('A a single unit yields the bare unit', () => {
    expect(buildOnce(1, 'day')).toBe('day')
  })
  it('B many units yield a pluralized recurrence', () => {
    expect(buildOnce(2, 'week')).toBe('2-weeks')
  })
  it('C an empty or zero quantity falls back to a single unit', () => {
    expect(buildOnce(0, 'month')).toBe('month')
  })
  it('D fractional quantities are truncated', () => {
    expect(buildOnce(3.9, 'year')).toBe('3-years')
  })
  it('E the result round-trips through daysRecurrence', () => {
    expect(daysRecurrence(buildOnce(2, 'week'))).toBe(14)
  })
  it('F a quantity beyond the regex 3-digit capture is clamped, never silently desyncs', () => {
    const once = buildOnce(1000, 'day')
    expect(daysRecurrence(once)).toBeGreaterThan(0)
  })
})

describe('parseOnce', () => {
  it('A a bare unit yields a quantity of one', () => {
    expect(parseOnce('day')).toStrictEqual({ quantity: 1, unit: 'day' })
  })
  it('B a pluralized recurrence yields quantity and singular unit', () => {
    expect(parseOnce('2-weeks')).toStrictEqual({ quantity: 2, unit: 'week' })
  })
  it('C an unparseable value falls back to one day', () => {
    expect(parseOnce('yes')).toStrictEqual({ quantity: 1, unit: 'day' })
  })
  it('D it round-trips with buildOnce', () => {
    const { quantity, unit } = parseOnce('3-months')
    expect(buildOnce(quantity, unit)).toBe('3-months')
  })
})
