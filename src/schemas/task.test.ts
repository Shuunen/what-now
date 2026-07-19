import { maxTasks, TaskSchema } from './task'

describe('TaskSchema', () => {
  it('A applies defaults for a minimal task', () => {
    const task = TaskSchema.parse({ id: 'id-1', name: 'do something' })
    expect(task).toStrictEqual({ completedOn: '', createdOn: '', id: 'id-1', isDone: false, minutes: 0, name: 'do something', once: 'day', updatedOn: '' })
  })

  it('B keeps provided values including reason', () => {
    const task = TaskSchema.parse({ completedOn: '2025-01-01', id: 'id-2', isDone: true, minutes: 15, name: 'clean', once: 'week', reason: 'tidy' })
    expect(task.reason).toBe('tidy')
    expect(task.once).toBe('week')
  })

  it('C rejects a task without an id', () => {
    expect(TaskSchema.safeParse({ name: 'no id' }).success).toBe(false)
  })

  it('D rejects a task with an empty name', () => {
    expect(TaskSchema.safeParse({ id: 'id-3', name: '' }).success).toBe(false)
  })

  it('E exposes a sane maxTasks bound', () => {
    expect(maxTasks).toBeGreaterThan(0)
  })
})
