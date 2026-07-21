import { invariant } from 'es-toolkit'
import { dateIso10, daysAgoIso10, nbDaysInMonth, nbDaysInWeek, nbDaysInYear, nbMsInDay } from 'shuutils'
import type { Task } from '../schemas/task'

const recurrenceRegex = /(?<quantity>\d{1,3})?-?(?<unit>day|month|week|year)/u

/** upper bound on a task's recurrence quantity, matching recurrenceRegex's 3-digit capture so buildOnce can never emit a value parseOnce/daysRecurrence would misread */
const maxRecurrenceQuantity = 999

/**
 * Build a task `once` value from a quantity and unit, matching the recurrenceRegex format.
 * @param quantity - how many units between occurrences, defaults to 1 when empty, invalid, or out of the regex's 1-999 range
 * @param unit - one of day, week, month, year
 * @returns the `once` string, e.g. "day" for a single unit or "2-weeks" for many
 */
export function buildOnce(quantity: number, unit: string) {
  const amount = Math.trunc(quantity) || 1
  if (amount <= 1) return unit
  return `${Math.min(amount, maxRecurrenceQuantity)}-${unit}s`
}

/**
 * Parse a task `once` value back into a quantity and singular unit, the inverse of buildOnce.
 * @param once - the `once` string, e.g. "day" or "2-weeks"
 * @returns the quantity and singular unit, defaulting to 1 day when unparseable
 */
export function parseOnce(once: string): { quantity: number; unit: string } {
  const matches = recurrenceRegex.exec(once)
  if (matches === null) return { quantity: 1, unit: 'day' }
  const quantity = Math.trunc(Number(matches.groups?.quantity ?? '1'))
  const unit = matches.groups?.unit as 'day' | 'month' | 'week' | 'year'
  return { quantity, unit }
}

export function daysRecurrence(once: string) {
  const matches = recurrenceRegex.exec(once)
  if (matches === null) return 0
  const quantity = matches.groups?.quantity ?? '1'
  const unit = matches.groups?.unit as 'day' | 'month' | 'week' | 'year'
  const number = Math.trunc(Number(quantity))
  if (unit === 'day') return number
  if (unit === 'week') return number * nbDaysInWeek
  if (unit === 'month') return number * nbDaysInMonth
  return number * nbDaysInYear
}

/**
 * Whether a task has never been completed, meaning its `completedOn` can't be parsed as a date.
 * @param task - the task to check
 * @returns true when the task has no completion date yet
 */
export function isNeverCompleted(task: Task) {
  return task.completedOn === ''
}

export function daysSinceCompletion(task: Task) {
  const today = dateIso10(new Date())
  const todayTimestamp = new Date(today).getTime()
  const completedOnTimestamp = new Date(task.completedOn).getTime()
  return (todayTimestamp - completedOnTimestamp) / nbMsInDay
}

export function isTaskActive(task: Task, shouldIncludeCompletedToday = false) {
  if (task.deletedOn !== '') return false
  if (task.isDone) return false
  if (isNeverCompleted(task) || task.once === 'yes') return true
  const recurrence = daysRecurrence(task.once)
  const days = daysSinceCompletion(task)
  const isActive = (shouldIncludeCompletedToday && days === 0) || days >= recurrence
  return isActive
}

/**
 * Calculates the total number of minutes remaining for all active tasks in the provided array.
 * @param tasks - An array of `Task` objects to evaluate.
 * @returns The total minutes remaining for all active tasks.
 */
export function minutesRemaining(tasks: Task[]) {
  let minutes = 0
  for (const task of tasks) if (isTaskActive(task)) minutes += task.minutes
  return minutes
}

/**
 * Mark a task as completed for today, returning a new task (does not mutate the input).
 * @param task - the task to complete
 * @returns the updated task
 */
export function completeTask(task: Task): Task {
  return {
    ...task,
    completedOn: dateIso10(new Date()), // task is complete for today
    isDone: task.once === 'yes', // but it also can be done totally if it was a one time job
    syncedAt: new Date().toISOString(), // bump the sync clock on every write, including toggles ; updatedOn is untouched, it only tracks quote edits
  }
}

/**
 * Un-complete a task by pushing its completion date just before the required number of days.
 * @param task - the task to un-complete
 * @returns the updated task
 */
export function unCompleteTask(task: Task): Task {
  return { ...task, completedOn: daysAgoIso10(daysRecurrence(task.once)), isDone: false, syncedAt: new Date().toISOString() }
}

/**
 * Soft-delete a task: stamps `deletedOn` so the task is hidden everywhere and the deletion can
 * propagate through sync as a tombstone, without ever hard-removing the row (a hard removal would
 * give sync nothing to compare timestamps against, and a stale remote copy could resurrect it).
 * @param task - the task to delete
 * @returns the updated task
 */
export function deleteTask(task: Task): Task {
  const now = new Date().toISOString()
  return { ...task, deletedOn: now, syncedAt: now }
}

/**
 * Merge two versions of the same task (e.g. local vs. remote during sync), picking the winner by
 * last-write-wins on `syncedAt` — the single clock bumped by every mutation, including `deleteTask`,
 * so no separate tombstone tie-break is needed: a delete is just another write and wins exactly when
 * it's the most recent one. On an exact tie (e.g. neither side has ever synced), prefer whichever
 * side is not deleted, so an ambiguous tie never silently drops data.
 * @param taskA - one version of the task (e.g. local)
 * @param taskB - the other version of the task (e.g. remote), must share the same id as `taskA`
 * @returns the winning version
 */
export function mergeTask(taskA: Task, taskB: Task): Task {
  invariant(taskA.id === taskB.id, `mergeTask called with mismatched task ids "${taskA.id}" vs "${taskB.id}"`)
  if (taskA.syncedAt > taskB.syncedAt) return taskA
  if (taskB.syncedAt > taskA.syncedAt) return taskB
  if (taskA.deletedOn === '' && taskB.deletedOn !== '') return taskA
  if (taskB.deletedOn === '' && taskA.deletedOn !== '') return taskB
  return taskA
}

export function byActive(taskA: Task, taskB: Task) {
  const isA = isTaskActive(taskA)
  const isB = isTaskActive(taskB)
  if (isA && !isB) return -1
  if (!isA && isB) return 1
  return 0
}

/**
 * Toggle a task's completion state, returning a new task.
 * @param task - the task to toggle
 * @returns the updated task
 */
export function toggleComplete(task: Task): Task {
  if (isTaskActive(task)) return completeTask(task)
  return unCompleteTask(task)
}

/** the fields a user provides when creating a brand-new task */
export type NewTaskFields = Pick<Task, 'name'> & Partial<Omit<Task, 'id'>>

/**
 * Create a brand-new task with a freshly generated id and sensible defaults.
 * @param fields - the task fields, name is required
 * @returns the new task, never completed and not done
 */
export function createTask(fields: NewTaskFields): Task {
  return { completedOn: '', createdOn: new Date().toISOString(), deletedOn: '', isDone: false, minutes: 0, once: 'day', syncedAt: '', updatedOn: '', ...fields, id: crypto.randomUUID() }
}

/**
 * Create a task mock with default values
 * @param fields - fields to override
 * @returns a task mock
 */
export function taskMock(fields: Partial<Task> = {}): Task {
  const { completedOn = daysAgoIso10(0), createdOn = daysAgoIso10(0), deletedOn = '', id = 'id-123', isDone = false, minutes = 20, name = 'a super task', once = 'day', reason, syncedAt = '', updatedOn = '' } = { ...fields }
  return { completedOn, createdOn, deletedOn, id, isDone, minutes, name, once, reason, syncedAt, updatedOn } satisfies Task
}
