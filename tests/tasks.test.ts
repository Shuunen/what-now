
import { strictEqual as equal } from 'assert'
import { daysAgoIso10 } from 'shuutils'
import { Task } from '../src/models'

describe('task', () => {
  const name = 'a super task'
  const id = '42'
  const today = daysAgoIso10(0)
  const yesterday = daysAgoIso10(1)

  it('a task without completed on is active', () => {
    const task = new Task(id, name, 'day')
    equal(task.isActive(), true)
    equal(task.name, name)
  })

  it('a daily task completed yesterday is active', () => {
    const task = new Task(id, name, 'day', yesterday)
    equal(task.isActive(), true)
  })

  it('a weekly task completed yesterday is inactive', () => {
    const task = new Task(id, name, 'week', yesterday)
    equal(task.isActive(), false)
  })

  it('a monthly task completed 20 days ago is inactive', () => {
    const task = new Task(id, name, 'month', daysAgoIso10(20))
    equal(task.isActive(), false)
  })

  it('a bi-monthly task completed 20 days ago is active', () => {
    const task = new Task(id, name, '2-weeks', daysAgoIso10(20))
    equal(task.isActive(), true)
  })

  it('a bi-annual task completed 20 days ago is inactive', () => {
    const task = new Task(id, name, '6-month', daysAgoIso10(20))
    equal(task.isActive(), false)
  })

  it('a non-handled once format result in a active task', () => {
    const task = new Task(id, name, '3-paper', yesterday)
    equal(task.isActive(), true)
  })

  it('days since completion is 0 is no date is provided', () => {
    const task = new Task(id, name, 'day')
    equal(task.daysSinceCompletion(), 0)
  })

  it('a bonus task is inactive by default', () => {
    const task = new Task(id, name, 'bonus')
    equal(task.isActive(), false)
  })

  it('a bonus task can be activated on demand & became active', () => {
    const task = new Task(id, name, 'bonus')
    task.activated = true
    equal(task.isActive(), true)
  })

  it('a one time task is active by default', () => {
    const task = new Task(id, name, 'yes')
    equal(task.isActive(), true)
  })

  it('complete a task update completed on date', () => {
    const task = new Task(id, name, 'week', yesterday)
    task.complete()
    equal(task.done, false) // no a one time task, so we will have to do it again
    equal(task.completedOn, today)
  })

  it('complete a one-time task mark it as done', () => {
    const task = new Task(id, name, 'yes')
    task.complete()
    equal(task.done, true)
  })

  it('toggle complete switches task active state', () => {
    const task = new Task(id, name, 'day', yesterday)
    equal(task.isActive(), true)
    task.toggleComplete()
    equal(task.activated, false)
    task.toggleComplete()
    equal(task.activated, true)
  })
})
