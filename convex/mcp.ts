import { invariant } from 'es-toolkit'
import { api } from './_generated/api'
import type { ActionCtx } from './_generated/server'
import { byCoachPriority, computeProgressPercent, dateIso10, daysAgoIso10, daysRecurrence, isTaskActive, overdueDays } from './recurrence'

/** mirrors `maxTaskTextLength` in `src/schemas/task.ts`, so the coach can't write a task the app would reject on import */
const maxTaskTextLength = 150

/** how many tasks `find_task` returns at most, keeping a spoken answer short */
const maxSearchResults = 8

/** shortest rhythm that can be deferred: below this, pushing a task to tomorrow and completing it are the same write */
const minDeferrableRecurrence = 2

/** a rhythm the recurrence math understands: an optional quantity, then a unit */
const rhythmRegex = /^(?:\d{1,3}-?)?(?:day|week|month|year)s?$/u

/** the app-shape task, as stored by `convex/schema.ts` and returned by `tasks:getAllTasks` */
type SyncedTask = {
  completedOn: string
  createdOn: string
  deletedOn: string
  id: string
  isDone: boolean
  minutes: number
  name: string
  once: string
  reason?: string
  syncedAt: string
  updatedOn: string
}

/** a tool as advertised over MCP */
type McpTool = { description: string; inputSchema: Record<string, unknown>; name: string }

/** what every tool handler receives: the caller's arguments and the current state of the list */
type ToolInput = { args: Record<string, unknown>; ctx: ActionCtx; tasks: SyncedTask[] }

/** what a handler on one existing task receives */
type TaskToolInput = ToolInput & { task: SyncedTask }

/**
 * Read a string argument, ignoring anything the client sent that is not actually a string.
 * @param value - the raw argument value
 * @param fallback - what to use when the value is missing or not a string, defaults to empty
 * @returns the string value
 */
export function textArg(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

/**
 * Read a numeric argument, ignoring anything that is not a finite number.
 * @param value - the raw argument value
 * @param fallback - what to use when the value is missing or not a number
 * @returns the numeric value, never negative
 */
function numberArg(value: unknown, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.max(0, value)
}

/**
 * Read a rhythm argument, refusing anything the app's recurrence math could not parse, which would
 * silently make the task due every day.
 * @param value - the raw argument value
 * @param fallback - what to use when the value is missing or not a string
 * @returns the validated rhythm, e.g. "day", "2-weeks" or "yes"
 */
function rhythmArg(value: unknown, fallback: string) {
  const rhythm = textArg(value, fallback).trim()
  invariant(rhythm === 'yes' || rhythmRegex.test(rhythm), `"${rhythm}" is not a valid rhythm — use "day", "week", "month", "year", "2-days", "3-weeks", "2-months" and so on, or "yes" for a one-time task`)
  return rhythm
}

/**
 * Build a JSON Schema object for a tool's arguments.
 * @param properties - the argument properties
 * @param required - the names of the required arguments, defaults to none
 * @returns the JSON Schema
 */
function schema(properties: Record<string, unknown>, required: string[] = []) {
  return { additionalProperties: false, properties, required, type: 'object' }
}

const idArg = { description: 'The task id, as returned by get_today or find_task.', type: 'string' }

export const tools: McpTool[] = [
  {
    description:
      "Read the whole task list and return everything needed to open a coaching session: today's date, the tasks that are due right now (already sorted by how overdue they are relative to their own rhythm), how many minutes they add up to, the progress percent the app itself displays, and how many due tasks still lack a reason. Call this once at the very start of every session, before greeting the user.",
    inputSchema: schema({}),
    name: 'get_today',
  },
  {
    description: 'Search every task by name or reason, including ones not due today, so a task the user mentions out loud can be resolved to its id. Use this when the user refers to something that was not in the get_today list.',
    inputSchema: schema({ query: { description: 'Words to look for in the task name or reason, case- and accent-insensitive.', type: 'string' } }, ['query']),
    name: 'find_task',
  },
  {
    description: 'Create a brand-new task. Write the name in the same language as the rest of the list (usually French), not in the language being spoken.',
    inputSchema: schema(
      {
        minutes: { description: 'Rough number of minutes the task takes. Use 0 when unknown.', minimum: 0, type: 'number' },
        name: { description: `The task label, at most ${maxTaskTextLength} characters.`, type: 'string' },
        once: { description: 'The rhythm: "day", "week", "month", "year", "2-days", "3-weeks", "2-months" and so on, or "yes" for a one-time task. Defaults to "day".', type: 'string' },
        reason: { description: `Why this matters to the user, in their own words, at most ${maxTaskTextLength} characters.`, type: 'string' },
      },
      ['name'],
    ),
    name: 'add_task',
  },
  { description: 'Mark a task as done today. A one-time task ("yes") is finished for good; a recurring one simply resets its clock.', inputSchema: schema({ id: idArg }, ['id']), name: 'complete_task' },
  { description: 'Undo a completion: the task becomes due again immediately.', inputSchema: schema({ id: idArg }, ['id']), name: 'uncomplete_task' },
  {
    description:
      'Push a task to tomorrow by rewinding its completion clock. This rewrites history and shifts the task\'s whole future rhythm, so only use it when the user explicitly asks for a real deferral rather than a "not today". Refuses on daily and one-time tasks, where deferring and completing would be the same write.',
    inputSchema: schema({ id: idArg }, ['id']),
    name: 'defer_task',
  },
  {
    description: 'Save why a task matters to the user. Condense their spoken answer into one sentence they would recognise as their own, in the same language as the task name. This is what the coach leads with next time.',
    inputSchema: schema({ id: idArg, reason: { description: `The reason, at most ${maxTaskTextLength} characters.`, type: 'string' } }, ['id', 'reason']),
    name: 'set_reason',
  },
  {
    description: "Edit a task's name, rhythm or duration. Only the fields provided are changed.",
    inputSchema: schema(
      { id: idArg, minutes: { description: 'The new duration in minutes.', minimum: 0, type: 'number' }, name: { description: 'The new label.', type: 'string' }, once: { description: 'The new rhythm, e.g. "2-weeks".', type: 'string' } },
      ['id'],
    ),
    name: 'update_task',
  },
  { description: 'Soft-delete a task. It is hidden everywhere but kept in storage, so it stays recoverable. Always confirm with the user out loud before calling this.', inputSchema: schema({ id: idArg }, ['id']), name: 'delete_task' },
]

/**
 * Persist a task, always stamping the sync clock so a stale copy on another device can never win the
 * last-write-wins merge and silently undo the coach.
 * @param ctx - the Convex action context
 * @param task - the complete task to write
 * @returns the task as written
 */
async function writeTask(ctx: ActionCtx, task: SyncedTask) {
  const written = { ...task, syncedAt: new Date().toISOString() }
  await ctx.runMutation(api.tasks.upsertTask, written)
  return written
}

/**
 * Trim a text field to the app's own maximum length.
 * @param text - the raw text
 * @returns the text, capped
 */
function capText(text: string) {
  return text.slice(0, maxTaskTextLength)
}

/**
 * Lowercase and strip accents, so "rangé" matches a spoken "range".
 * @param text - the text to normalize
 * @returns the normalized text
 */
function normalize(text: string) {
  return text
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/**
 * The compact shape of a task handed to the model: enough to coach with, nothing to read aloud by accident.
 * @param task - the task to summarize
 * @returns the summary
 */
function summarize(task: SyncedTask) {
  return {
    id: task.id,
    isDue: isTaskActive(task),
    lastDoneOn: task.completedOn === '' ? 'never' : task.completedOn,
    minutes: task.minutes,
    name: task.name,
    overdueDays: Math.round(overdueDays(task)),
    reason: task.reason === undefined || task.reason === '' ? undefined : task.reason,
    rhythm: task.once,
  }
}

/**
 * Adapt a handler that needs one existing task, resolving the `id` argument and failing loudly when
 * it names nothing.
 * @param handler - the handler to wrap
 * @returns a handler that resolves the task first
 */
function withTask(handler: (input: TaskToolInput) => Promise<string>) {
  return (input: ToolInput) => {
    const id = textArg(input.args.id)
    const task = input.tasks.find(candidate => candidate.id === id)
    invariant(task, `no task found with id "${id}" — call get_today or find_task first to get a real id`)
    return handler({ ...input, task })
  }
}

const handlers: Record<string, (input: ToolInput) => Promise<string>> = {
  add_task: async ({ args, ctx }) => {
    const label = capText(textArg(args.name).trim())
    invariant(label !== '', 'add_task needs a name')
    const now = new Date().toISOString()
    const rawReason = textArg(args.reason).trim()
    const created = await writeTask(ctx, {
      completedOn: '',
      createdOn: now,
      deletedOn: '',
      id: crypto.randomUUID(),
      isDone: false,
      minutes: numberArg(args.minutes, 0),
      name: label,
      once: rhythmArg(args.once, 'day'),
      reason: rawReason === '' ? undefined : capText(rawReason),
      syncedAt: now,
      updatedOn: '',
    })
    return JSON.stringify({ added: summarize(created) })
  },
  complete_task: withTask(async ({ ctx, task, tasks }) => {
    const done = await writeTask(ctx, { ...task, completedOn: dateIso10(), isDone: task.once === 'yes' })
    const after = tasks.map(item => (item.id === done.id ? done : item))
    return JSON.stringify({ completed: summarize(done), progressPercent: computeProgressPercent(after) })
  }),
  defer_task: withTask(async ({ ctx, task }) => {
    const recurrence = daysRecurrence(task.once)
    if (recurrence < minDeferrableRecurrence) {
      const cadence = task.once === 'yes' ? 'is a one-time task' : 'repeats every day'
      const why = `"${task.name}" ${cadence}, so pushing it to tomorrow and marking it done are the same write. Tell the user you are skipping it for today instead — it just stays due.`
      return JSON.stringify({ refused: true, why })
    }
    const deferred = await writeTask(ctx, { ...task, completedOn: daysAgoIso10(recurrence - 1), isDone: false })
    return JSON.stringify({ deferred: summarize(deferred), warning: "This rewrote the task's completion date, so its future rhythm has shifted forward by a day. Say so out loud." })
  }),
  delete_task: withTask(async ({ ctx, task }) => {
    const deleted = await writeTask(ctx, { ...task, deletedOn: new Date().toISOString() })
    return JSON.stringify({ deleted: { id: deleted.id, name: deleted.name }, recoverable: true })
  }),
  find_task: ({ args, tasks }) => {
    const query = normalize(textArg(args.query).trim())
    invariant(query !== '', 'find_task needs a non-empty query')
    const matches = tasks.filter(task => task.deletedOn === '' && (normalize(task.name).includes(query) || normalize(task.reason ?? '').includes(query)))
    return Promise.resolve(JSON.stringify({ matchCount: matches.length, matches: matches.slice(0, maxSearchResults).map(task => summarize(task)) }))
  },
  get_today: ({ tasks }) => {
    const due = tasks.filter(task => isTaskActive(task)).toSorted(byCoachPriority)
    return Promise.resolve(
      JSON.stringify({
        dueCount: due.length,
        dueTasks: due.map(task => summarize(task)),
        progressPercent: computeProgressPercent(tasks),
        tasksMissingAReason: due.filter(task => task.reason === undefined || task.reason === '').length,
        today: dateIso10(),
        totalMinutes: due.reduce((total, task) => total + task.minutes, 0),
      }),
    )
  },
  set_reason: withTask(async ({ args, ctx, task }) => {
    const reason = capText(textArg(args.reason).trim())
    invariant(reason !== '', 'set_reason needs a non-empty reason')
    const updated = await writeTask(ctx, { ...task, reason, updatedOn: new Date().toISOString() })
    return JSON.stringify({ reasonSaved: summarize(updated) })
  }),
  uncomplete_task: withTask(async ({ ctx, task }) => {
    const undone = await writeTask(ctx, { ...task, completedOn: daysAgoIso10(daysRecurrence(task.once)), isDone: false })
    return JSON.stringify({ uncompleted: summarize(undone) })
  }),
  update_task: withTask(async ({ args, ctx, task }) => {
    const label = args.name === undefined ? task.name : capText(textArg(args.name).trim())
    invariant(label !== '', 'update_task needs a non-empty name')
    const updated = await writeTask(ctx, {
      ...task,
      minutes: numberArg(args.minutes, task.minutes),
      name: args.name === undefined ? task.name : label,
      once: rhythmArg(args.once, task.once),
      updatedOn: new Date().toISOString(),
    })
    return JSON.stringify({ updated: summarize(updated) })
  }),
}

/**
 * Run one MCP tool.
 * @param ctx - the Convex action context
 * @param name - the tool name
 * @param args - the tool arguments, as sent by the client
 * @returns a JSON string describing the result, for the model to read
 */
export async function callTool(ctx: ActionCtx, name: string, args: Record<string, unknown>) {
  const handler = handlers[name]
  invariant(handler, `unknown tool "${name}"`)
  const tasks = (await ctx.runQuery(api.tasks.getAllTasks, {})) as SyncedTask[]
  return handler({ args, ctx, tasks })
}
