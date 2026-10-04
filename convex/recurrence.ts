/**
 * Self-contained copy of the recurrence + due-date math from `src/utils/tasks.utils.ts`.
 *
 * Deliberately duplicated rather than imported: the frontend module pulls in `shuutils`, whose
 * entry point touches browser globals at module scope and would not survive Convex's runtime.
 * `recurrence.test.ts` pins this implementation against the frontend one case-for-case, so the
 * two can never drift apart silently.
 */

const recurrenceRegex = /(?<quantity>\d{1,3})?-?(?<unit>day|month|week|year)/u

const nbDaysInWeek = 7
const nbDaysInMonth = 30
const nbDaysInYear = 365
const nbMsInDay = 86_400_000
const nbPercentMax = 100
/** characters in an iso10 date, e.g. "2025-01-26" */
const iso10Length = 10

/** the task shape this module reasons about, a structural subset of the app's `Task` */
export type RecurringTask = {
  completedOn: string
  deletedOn: string
  isDone: boolean
  minutes: number
  name: string
  once: string
  reason?: string
}

/**
 * The UTC calendar date of a moment, matching `shuutils`' `dateIso10`.
 * @param date - the moment to format, defaults to now
 * @returns the iso10 date @example "2025-01-26"
 */
export function dateIso10(date = new Date()) {
  return date.toISOString().slice(0, iso10Length)
}

/**
 * The iso10 date N days before today, matching `shuutils`' `daysAgoIso10` (local day arithmetic,
 * UTC formatting).
 * @param nbDays - how many days to step back, defaults to 0
 * @returns the iso10 date @example "2025-01-19"
 */
export function daysAgoIso10(nbDays = 0) {
  const date = new Date()
  date.setDate(date.getDate() - nbDays)
  return dateIso10(date)
}

/**
 * Convert a task `once` string into a number of days.
 * @param once - the recurrence string, e.g. "day", "2-weeks", "yes"
 * @returns the number of days between occurrences, 0 when unparseable (e.g. "yes")
 */
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
 * Whole days between a task's last completion and today.
 * @param task - the task to measure
 * @returns the number of days, NaN when the task was never completed
 */
export function daysSinceCompletion(task: RecurringTask) {
  const todayTimestamp = new Date(dateIso10()).getTime()
  const completedOnTimestamp = new Date(task.completedOn).getTime()
  return (todayTimestamp - completedOnTimestamp) / nbMsInDay
}

/**
 * Whether a task is due, mirroring the app's own visibility rule.
 * @param task - the task to test
 * @param shouldIncludeCompletedToday - when true, a task completed today still counts as active
 * @returns true when the task should be shown today
 */
export function isTaskActive(task: RecurringTask, shouldIncludeCompletedToday = false) {
  if (task.deletedOn !== '') return false
  if (task.isDone) return false
  if (task.completedOn === '' || task.once === 'yes') return true
  const recurrence = daysRecurrence(task.once)
  const days = daysSinceCompletion(task)
  return (shouldIncludeCompletedToday && days === 0) || days >= recurrence
}

/**
 * How many days past due a task is, relative to its own rhythm.
 * @param task - the task to measure
 * @returns days overdue, 0 for a task due exactly today or never completed
 */
export function overdueDays(task: RecurringTask) {
  if (task.completedOn === '') return 0
  const overdue = daysSinceCompletion(task) - daysRecurrence(task.once)
  return Math.max(0, overdue)
}

/**
 * Lateness expressed as a fraction of the task's own rhythm, so a 3-day-late daily task outranks a
 * 3-day-late quarterly one. Never-completed tasks sort as mildly late rather than not late at all.
 * @param task - the task to score
 * @returns the overdue ratio, higher means more urgent
 */
export function overdueRatio(task: RecurringTask) {
  const recurrence = daysRecurrence(task.once)
  if (recurrence <= 0) return 1
  if (task.completedOn === '') return 1
  return overdueDays(task) / recurrence
}

/**
 * Order tasks the way the coach should suggest them: most overdue relative to its own rhythm first,
 * then the quickest win, then the ones that already carry a reason.
 * @param taskA - the first task to compare
 * @param taskB - the second task to compare
 * @returns a standard comparator result
 */
export function byCoachPriority(taskA: RecurringTask, taskB: RecurringTask) {
  const ratioDelta = overdueRatio(taskB) - overdueRatio(taskA)
  if (ratioDelta !== 0) return ratioDelta
  const minutesDelta = taskA.minutes - taskB.minutes
  if (minutesDelta !== 0) return minutesDelta
  const reasonA = taskA.reason === undefined || taskA.reason === '' ? 1 : 0
  const reasonB = taskB.reason === undefined || taskB.reason === '' ? 1 : 0
  return reasonA - reasonB
}

/**
 * The app's own progress number: of the tasks on today's plate, how many are already behind us.
 * @param tasks - every task in the deployment
 * @returns the completion percent shown on the app's task page
 */
export function computeProgressPercent(tasks: RecurringTask[]) {
  const todayTasks = tasks.filter(task => isTaskActive(task, true))
  const total = todayTasks.length
  if (total === 0) return 0
  const remaining = todayTasks.filter(task => isTaskActive(task)).length
  return nbPercentMax - Math.round((remaining / total) * nbPercentMax)
}
