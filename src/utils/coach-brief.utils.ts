import type { Task } from '../schemas/task'
import { daysRecurrence, daysSinceCompletion, isNeverCompleted, isTaskActive } from './tasks.utils'

/**
 * Turns the live task list into the briefing the coach reads before every one
 * of its turns, plus the directives that frame those turns. The coach is given
 * the whole list rather than one task at a time -- that's what lets it suggest
 * an order, group tasks that go together, and answer "what else is there?" --
 * and it's re-sent every turn so a completion (from the conversation or from a
 * tap on the screen) is reflected immediately.
 *
 * Tasks are numbered rather than referred to by id: ids are uuids, which a 3b
 * model mangles constantly, while small integers survive both the model's
 * output and, in the extractor, its JSON. The numbers never leave this layer --
 * the coach is told not to say them out loud, and `findBriefTask` maps them
 * back to real tasks.
 */

export type CoachTaskBrief = {
  number: number
  task: Task
}

/** how many days past due a task must be before the briefing calls it out as lagging */
const lateDaysThreshold = 2

/**
 * Describes how overdue a task is, in words the model can reason about.
 * @param task - the task to describe
 * @returns a short human phrase, e.g. "never done yet" or "4 days overdue"
 */
function describeDueness(task: Task): string {
  if (task.once === 'yes') return 'a one-off, not recurring'
  if (isNeverCompleted(task)) return 'never done yet'
  const daysLate = Math.round(daysSinceCompletion(task) - daysRecurrence(task.once))
  if (daysLate >= lateDaysThreshold) return `${daysLate} days overdue`
  return 'due today'
}

/**
 * Sorts the most pressing task first: the longest overdue, then the ones never
 * done. Only a hint -- the coach is free to propose another order, and often
 * should (a quick win first, tasks that go together, whatever the user feels
 * like), which is exactly why this is a suggestion in a briefing rather than
 * the app picking for him.
 * @param taskA - one task
 * @param taskB - the other task
 * @returns the sort comparison
 */
function byMostPressing(taskA: Task, taskB: Task): number {
  const lateA = isNeverCompleted(taskA) ? 0 : daysSinceCompletion(taskA) - daysRecurrence(taskA.once)
  const lateB = isNeverCompleted(taskB) ? 0 : daysSinceCompletion(taskB) - daysRecurrence(taskB.once)
  return lateB - lateA
}

/**
 * Numbers the tasks still worth talking about: active, and not set aside
 * earlier in this conversation.
 * @param tasks - the full task list, read fresh from the store
 * @param skipIds - ids the user has already waved off during this session
 * @returns the numbered briefs, most pressing first
 */
export function buildTaskBriefs(tasks: Task[], skipIds: Set<string>): CoachTaskBrief[] {
  return tasks
    .filter(task => isTaskActive(task) && !skipIds.has(task.id))
    .toSorted(byMostPressing)
    .map((task, index) => ({ number: index + 1, task }))
}

/**
 * Renders the briefs as the plain-text list handed to the model each turn.
 * @param briefs - the numbered briefs
 * @returns one line per task, or a marker line when nothing is left
 */
export function describeTaskBriefs(briefs: CoachTaskBrief[]): string {
  if (briefs.length === 0) return 'Remaining tasks: none, everything is done.'
  const lines = briefs.map(({ number, task }) => {
    const reason = task.reason === undefined || task.reason === '' ? 'no reason recorded yet' : `it matters because: ${task.reason}`
    const duration = task.minutes > 0 ? `, about ${task.minutes} minutes` : ''
    return `${number}. "${task.name}" -- ${reason}${duration}, ${describeDueness(task)}`
  })
  return `Remaining tasks right now:\n${lines.join('\n')}`
}

/**
 * Finds the task a numbered action refers to.
 * @param briefs - the briefs the model was shown for that turn
 * @param number - the number the model answered with
 * @returns the matching task, or undefined when the model made a number up
 */
export function findBriefTask(briefs: CoachTaskBrief[], number: number): Task | undefined {
  return briefs.find(brief => brief.number === number)?.task
}

/**
 * Sums up the workload left, phrased for the opening line.
 * @param briefs - the numbered briefs
 * @returns a short phrase, e.g. "3 tasks left, roughly 40 minutes in total"
 */
function describeWorkload(briefs: CoachTaskBrief[]): string {
  const minutes = briefs.reduce((total, brief) => total + brief.task.minutes, 0)
  if (minutes === 0) return `${briefs.length} tasks left`
  return `${briefs.length} tasks left, roughly ${minutes} minutes in total`
}

/**
 * The directive opening the conversation: greet, size up the day, and propose
 * a way through it.
 * @param briefs - the numbered briefs for this turn
 * @returns the directive to prompt the model with
 */
export function openingDirective(briefs: CoachTaskBrief[]): string {
  return `${describeTaskBriefs(briefs)}\n\nThis is the very start of the conversation (${describeWorkload(briefs)}). Greet him, say briefly what is on his plate, then suggest one task to start with and why it is a good first one. End by asking him what he thinks.`
}

/**
 * The directive for every ordinary turn: what he just said, and what the app
 * did about it.
 * @param briefs - the numbered briefs for this turn
 * @param transcript - what the user just said out loud
 * @param applied - a sentence describing what the app just changed, if anything
 * @returns the directive to prompt the model with
 */
export function replyDirective(briefs: CoachTaskBrief[], transcript: string, applied: string): string {
  const done = applied === '' ? '' : `\n\nThe app has just done this for him: ${applied} Acknowledge it naturally, do not repeat it word for word.`
  return `${describeTaskBriefs(briefs)}\n\nHe just said out loud: "${transcript}"${done}\n\nReply to him as the coach. Keep the conversation moving: react to what he said, then either suggest what to tackle next or ask him something useful.`
}

/**
 * The directive used when he says nothing at all -- a gentle check-in rather
 * than a canned "I didn't catch that", which is what made the old flow feel
 * like a phone menu.
 * @param briefs - the numbered briefs for this turn
 * @returns the directive to prompt the model with
 */
export function silenceDirective(briefs: CoachTaskBrief[]): string {
  return `${describeTaskBriefs(briefs)}\n\nHe did not say anything -- he may be busy, thinking, or already working. Check in on him warmly in one short sentence, without repeating your previous line.`
}

/**
 * The directive closing the conversation, either because he asked to stop or
 * because there is nothing left to do.
 * @param briefs - the numbered briefs for this turn
 * @returns the directive to prompt the model with
 */
export function closingDirective(briefs: CoachTaskBrief[]): string {
  if (briefs.length === 0) return 'Everything on his list is done. Congratulate him warmly in one short sentence and say goodbye.'
  return 'He wants to stop here for now. Say goodbye warmly in one short sentence, leaving him on a positive note. Do not list what is left and do not try to convince him to continue.'
}
