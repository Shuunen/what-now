import { dateIso10 } from 'shuutils'
import type { Task } from '../schemas/task'
import { daysRecurrence, daysSinceCompletion, isNeverCompleted, parseOnce } from './tasks.utils'

/** The task fields a user can edit inline from the planner quote form. */
export type TaskFieldModifications = { minutes?: number; name?: string; reason?: string }

/**
 * The pending, not-yet-saved edits accumulated in the planner from both the controls and the quote form.
 * `frequency` holds the task's new `once` string (e.g. "2-weeks", "month"), not a raw day count, so the
 * unit picked in the quote form survives round-trips instead of collapsing to an "N-days" value.
 */
export type TaskModifications = {
  frequency: Record<string, string>
  completedOn: Record<string, string>
  fields: Record<string, TaskFieldModifications>
}

// Day names indexed by Date.getDay() (0 = Sunday), used to label the rolling planner window that starts today
export const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const daysInWeek = 14
export const allDayIndices = Array.from({ length: daysInWeek }, (_unused, index) => index)
export const dailyRecurrence = 1
export const twoDayRecurrence = 2
export const threeDayRecurrence = 3
export const weeklyRecurrence = 7

// Constants for recurrence patterns
export const dayFrequency = 1
export const weekFrequency = 7
export const biWeeklyFrequency = 14
export const triWeeklyFrequency = 21
export const monthlyFrequency = 28

// Valid frequency options in ascending order (higher frequency = lower number)
export const validFrequencies = [
  dayFrequency,
  // oxlint-disable no-magic-numbers
  2,
  3,
  4,
  5,
  6,
  // oxlint-enable no-magic-numbers
  weekFrequency,
  biWeeklyFrequency,
  triWeeklyFrequency,
  monthlyFrequency,
]

/**
 * Converts days recurrence to frequency string
 * @param days - Number of days between recurrences
 * @returns Frequency string for the task's once property
 */
export function daysToFrequencyString(days: number): string {
  if (days === dayFrequency) return 'day'
  if (days === weekFrequency) return 'week'
  if (days === biWeeklyFrequency) return '2-weeks'
  if (days === triWeeklyFrequency) return '3-weeks'
  if (days === monthlyFrequency) return '4-weeks'
  return `${days}-days`
}

/**
 * Human-readable label for a task's recurrence, shown on the planner cards.
 * @param once - the task's `once` string, e.g. "day", "2-weeks", "month"
 * @returns a friendly label such as "daily", "weekly" or "2 weeks"
 */
export function frequencyLabel(once: string): string {
  const { quantity, unit } = parseOnce(once)
  if (quantity <= 1) {
    if (unit === 'day') return 'daily'
    if (unit === 'week') return 'weekly'
    if (unit === 'month') return 'monthly'
    return 'yearly'
  }
  return `${quantity} ${unit}s`
}

/**
 * Gets the next higher frequency (lower days)
 * @param currentDays - Current recurrence in days
 * @returns Next higher frequency or undefined if already at maximum
 */
export function getHigherFrequency(currentDays: number): number | undefined {
  const currentIndex = validFrequencies.indexOf(currentDays)
  if (currentIndex <= 0) return undefined // Already at highest frequency (daily)
  return validFrequencies[currentIndex - 1]
}

/**
 * Gets the next lower frequency (higher days)
 * @param currentDays - Current recurrence in days
 * @returns Next lower frequency or undefined if already at minimum
 */
export function getLowerFrequency(currentDays: number): number | undefined {
  const currentIndex = validFrequencies.indexOf(currentDays)
  const notFound = -1
  if (currentIndex === notFound || currentIndex >= validFrequencies.length - 1) return undefined
  return validFrequencies[currentIndex + 1]
}

/**
 * Gets the effective recurrence for a task (considering modifications)
 * @param task - The task
 * @param modifications - Current modifications
 * @returns The effective recurrence in days
 */
export function getEffectiveRecurrence(task: Task, modifications: Record<string, string>): number {
  return daysRecurrence(modifications[task.id] ?? task.once)
}

/**
 * Gets a color class based on task recurrence for visual distinction
 * @param task - The task to get color for
 * @param modifications - Current modifications (optional)
 * @returns CSS classes for styling the task
 */
export function getTaskColor(task: Task, modifications: Record<string, string> = {}): string {
  const recurrence = getEffectiveRecurrence(task, modifications)
  if (recurrence === dailyRecurrence) return 'bg-red-900/10 border-red-500/30 text-red-300'
  if (recurrence === twoDayRecurrence) return 'bg-orange-900/10 border-orange-500/30 text-orange-300'
  if (recurrence === threeDayRecurrence) return 'bg-blue-900/10 border-blue-500/30 text-blue-300'
  if (recurrence >= weeklyRecurrence) return 'bg-green-900/10 border-green-500/30 text-green-300'
  return 'bg-gray-800/30 border-gray-600/30 text-gray-300'
}

/**
 * Calculates which days of the current two weeks a task should appear based on recurrence
 * @param daysSinceComplete - Days since task was last completed
 * @param recurrence - Task recurrence in days
 * @returns Array of day indices where task should appear
 */
function calculateWeeklyTaskDays(daysSinceComplete: number, recurrence: number): number[] {
  const taskDays: number[] = []
  // Day index 0 is today, so the offset from today equals the day index itself.
  for (let dayIndex = 0; dayIndex < daysInWeek; dayIndex += 1) {
    const totalDaysFromLastCompletion = daysSinceComplete + dayIndex
    if (totalDaysFromLastCompletion >= recurrence && totalDaysFromLastCompletion % recurrence === 0) taskDays.push(dayIndex)
  }
  return taskDays
}

/**
 * Determines which days of the two weeks a task should appear based on its effective recurrence pattern
 * @param task - The task to analyze
 * @param modifications - Current modifications to tasks
 * @returns Array of day indices (0-13) where the task should appear
 */
export function getTaskDaysWithModifications(task: Task, modifications: Record<string, string>): number[] {
  const recurrence = getEffectiveRecurrence(task, modifications)
  if (recurrence === 0 || task.once === 'yes') return []
  if (recurrence === dailyRecurrence) return allDayIndices
  // Never-completed tasks are immediately due, so anchor them at the recurrence boundary
  // instead of calling daysSinceCompletion(), which would produce NaN from new Date('').
  const daysSinceComplete = isNeverCompleted(task) ? recurrence : daysSinceCompletion(task)
  return calculateWeeklyTaskDays(daysSinceComplete, recurrence)
}

/**
 * When a task's recurrence changes, compute the completion date that keeps the first
 * instance currently shown in the planner in place, so only the later occurrences shift
 * to follow the new recurrence.
 * @param task - the task before the recurrence change (its current `once` and `completedOn`)
 * @param newRecurrence - the new recurrence in days
 * @returns the new `completedOn` (iso10) anchoring the first instance, or undefined when the task isn't shown in the planner
 */
export function anchoredCompletedOn(task: Task, newRecurrence: number): string | undefined {
  if (newRecurrence <= 0) return undefined
  const [firstDayIndex] = getTaskDaysWithModifications(task, {})
  if (firstDayIndex === undefined) return undefined
  const today = new Date()
  // Day index 0 is today, so the first instance sits firstDayIndex days from today.
  // Place the completion date one recurrence before it, so that instance stays put.
  const anchor = new Date(today)
  anchor.setDate(today.getDate() + firstDayIndex - newRecurrence)
  return dateIso10(anchor)
}

/**
 * Whether a task's earliest planner occurrence can move one day earlier without falling
 * out of the window into the past, which starts before today (day index 0) and can't be changed.
 * @param task - the task, with any completion modifications already applied
 * @param modifications - current frequency modifications
 * @returns true when the task recurs and its earliest occurrence sits after today
 */
export function canMoveTaskEarlier(task: Task, modifications: Record<string, string> = {}): boolean {
  if (task.once === 'day') return false
  const [firstDayIndex] = getTaskDaysWithModifications(task, modifications)
  return firstDayIndex !== undefined && firstDayIndex > 0
}

/**
 * Creates the task distribution data structure
 * @param tasks - Array of tasks to distribute
 * @param modifications - Current modifications to tasks
 * @returns Record mapping day indices to task arrays
 */
export function createTaskDistribution(tasks: Task[], modifications: Record<string, string> = {}) {
  // Create a map of day index to tasks for that day
  const tasksByDay: Record<number, Task[]> = {}
  for (let dayIndex = 0; dayIndex < daysInWeek; dayIndex += 1) tasksByDay[dayIndex] = []
  // Distribute tasks across days based on their effective recurrence
  for (const task of tasks) {
    const taskDays = getTaskDaysWithModifications(task, modifications)
    for (const dayIndex of taskDays) tasksByDay[dayIndex]?.push(task)
  }
  return tasksByDay
}

/**
 * Sanitizes inline field edits before merging them into a task: a blank name is dropped so the
 * task keeps its previous label, and a blank reason becomes undefined per the "no null" convention.
 * @param fields - the raw field edits, or undefined when the task has no field edits
 * @returns the partial task to spread over the original
 */
function applyFieldModifications(fields: TaskFieldModifications | undefined): Partial<Task> {
  if (fields === undefined) return {}
  const result: Partial<Task> = {}
  if (fields.name !== undefined && fields.name.trim() !== '') result.name = fields.name.trim()
  if (fields.minutes !== undefined) result.minutes = fields.minutes
  if (fields.reason !== undefined) result.reason = fields.reason.trim() === '' ? undefined : fields.reason.trim()
  return result
}

/**
 * Determines which tasks had their quote (name, frequency, reason or minutes) edited, as opposed to a mere
 * completion-date move, so callers can stamp `updatedOn` only for genuine quote edits.
 * @param modifications - The pending edits accumulated from the controls and the quote form
 * @returns The set of task ids whose name, frequency, reason or minutes changed
 */
export function getQuoteModifiedTaskIds(modifications: TaskModifications): Set<string> {
  const quoteFieldIds = Object.entries(modifications.fields)
    .filter(([, change]) => change.name !== undefined || change.reason !== undefined || change.minutes !== undefined)
    .map(([taskId]) => taskId)
  return new Set([...Object.keys(modifications.frequency), ...quoteFieldIds])
}

/**
 * Computes the updated tasks from the planner's pending frequency, date and inline field modifications
 * @param modifications - The pending edits accumulated from the controls and the quote form
 * @param tasks - Array of all tasks
 * @returns The list of modified tasks, ready to be persisted
 */
export function computeTaskModifications(modifications: TaskModifications, tasks: Task[]): Task[] {
  const modifiedTaskIds = new Set([...Object.keys(modifications.frequency), ...Object.keys(modifications.completedOn), ...Object.keys(modifications.fields)])
  const updated: Task[] = []
  for (const taskId of modifiedTaskIds) {
    const task = tasks.find(currentTask => currentTask.id === taskId)
    if (!task) continue
    const newOnce = modifications.frequency[taskId]
    const newCompletedOn = modifications.completedOn[taskId]
    updated.push({
      ...task,
      ...(newOnce === undefined ? {} : { once: newOnce }),
      ...(newCompletedOn === undefined ? {} : { completedOn: newCompletedOn }),
      ...applyFieldModifications(modifications.fields[taskId]),
    })
  }
  return updated
}
