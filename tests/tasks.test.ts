
import { daysAgoIso10 } from 'shuutils'
import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { Task } from '../src/models'

const name = 'a super task'
const id = '42'
const today = daysAgoIso10(0)
const yesterday = daysAgoIso10(1)

test('a task without completed on is active', function () {
  const task = new Task(id, name, 'day')
  equal(task.isActive(), true)
  equal(task.name, name)
})

test('a daily task completed yesterday is active', function () {
  const task = new Task(id, name, 'day', yesterday)
  equal(task.isActive(), true)
})

test('a weekly task completed yesterday is inactive', function () {
  const task = new Task(id, name, 'week', yesterday)
  equal(task.isActive(), false)
})

test('a monthly task completed 20 days ago is inactive', function () {
  const task = new Task(id, name, 'month', daysAgoIso10(20))
  equal(task.isActive(), false)
})

test('a bi-monthly task completed 20 days ago is active', function () {
  const task = new Task(id, name, '2-weeks', daysAgoIso10(20))
  equal(task.isActive(), true)
})

test('a bi-annual task completed 20 days ago is inactive', function () {
  const task = new Task(id, name, '6-month', daysAgoIso10(20))
  equal(task.isActive(), false)
})

test('a non-handled once format result in a active task', function () {
  const task = new Task(id, name, '3-paper', yesterday)
  equal(task.isActive(), true)
})

test('days since completion is 0 is no date is provided', function () {
  const task = new Task(id, name, 'day')
  equal(task.daysSinceCompletion(), 0)
})

test('a bonus task is inactive by default', function () {
  const task = new Task(id, name, 'bonus')
  equal(task.isActive(), false)
})

test('a bonus task can be activated on demand & became active', function () {
  const task = new Task(id, name, 'bonus')
  task.activated = true
  equal(task.isActive(), true)
})

test('a one time task is active by default', function () {
  const task = new Task(id, name, 'yes')
  equal(task.isActive(), true)
})

test('complete a task update completed on date', function () {
  const task = new Task(id, name, 'week', yesterday)
  task.complete()
  equal(task.done, false) // no a one time task, so we will have to do it again
  equal(task.completedOn, today)
})

test('complete a one-time task mark it as done', function () {
  const task = new Task(id, name, 'yes')
  task.complete()
  equal(task.done, true)
})

test('toggle complete switches task active state', function () {
  const task = new Task(id, name, 'day', yesterday)
  equal(task.isActive(), true)
  task.toggleComplete()
  equal(task.activated, false)
  task.toggleComplete()
  equal(task.activated, true)
})

test.run()
