import { v } from 'convex/values'
import { pick } from 'es-toolkit'
import { api } from './_generated/api'
import type { Doc } from './_generated/dataModel'
import { mutation, query } from './_generated/server'
import schema from './schema'

/**
 * Bumped whenever this schema/function set changes shape in a way the frontend needs to detect.
 * The `health` query returns this so the app can tell a stale self-hosted deployment (predating a
 * schema change) apart from a wrong/unreachable URL, per the data-sync design doc's "stale
 * deployment" success criterion.
 */
const schemaVersion = 1

/**
 * Upper bound on rows processed by a single `clearAllTasks` batch, kept well under Convex's
 * ~8,000-writes-per-mutation limit so the delete-everything action stays safe even though the
 * app's own `maxTasks` import cap (10,000) is close to that limit.
 */
const clearBatchSize = 2000

/** validators for the app-shape Task fields, shared between the upsert mutation args and query returns — derived from `schema.ts` so the two never drift apart */
const taskFields = schema.tables.tasks.validator.fields

/**
 * Strip Convex's own `_id`/`_creationTime` off a row, returning just the app-shape Task fields.
 * @param row - the raw `tasks` table row, as read from `ctx.db`
 * @returns the same task, without Convex's storage-level fields
 */
function toTaskFields(row: Doc<'tasks'>) {
  return pick(row, Object.keys(taskFields) as (keyof typeof taskFields)[])
}

/**
 * Health-check the deployment and report its schema version, so the frontend can tell "wrong URL"
 * (network/parse failure before this even returns) apart from "stale deployment that predates a
 * schema change" (this returns, but with an older `schemaVersion` than the app expects) before it
 * attempts any real sync call.
 */
export const health = query({
  handler: () => ({ ok: true, schemaVersion }),
  returns: v.object({ ok: v.boolean(), schemaVersion: v.number() }),
})

/**
 * Fetch every task, including soft-deleted ones (`deletedOn !== ''`), so the client can run a full
 * reconciliation pass against its local copy and pick up live updates via Convex's reactivity.
 * Excluding deleted rows here would let a stale local copy resurrect a task another device deleted.
 *
 * `.collect()` (rather than `.paginate`) is deliberate: this table is single-tenant (one user's
 * tasks, one deployment) and provably bounded by the app's own `maxTasks = 10_000` import cap
 * enforced client-side (`src/schemas/task.ts`), comfortably under Convex's ~16,000-document read
 * ceiling per function. If that cap is ever raised materially, switch this to `paginationOptsValidator`.
 */
export const getAllTasks = query({
  handler: async ctx => {
    const rows = await ctx.db.query('tasks').collect()
    return rows.map(row => toTaskFields(row))
  },
  returns: v.array(v.object(taskFields)),
})

/**
 * Upsert a single task by the app's own `id` field (not Convex's `_id`): inserts if unseen, else
 * patches the existing row. This is also how deletes are propagated — `deleteTask` on the client
 * just sets `deletedOn`/`syncedAt` and calls this same upsert, so no separate delete mutation is
 * needed for the per-task case (only the bulk "delete my synced data" wipe below is separate).
 */
export const upsertTask = mutation({
  args: taskFields,
  handler: async (ctx, task) => {
    const existing = await ctx.db
      .query('tasks')
      .withIndex('by_task_id', matcher => matcher.eq('id', task.id))
      .unique()
    if (existing === null) await ctx.db.insert('tasks', task)
    // oxlint-disable-next-line no-underscore-dangle -- `_id` is Convex's own generated field name, not ours to rename
    else await ctx.db.patch(existing._id, task)
    // oxlint-disable-next-line unicorn/no-null -- Convex's `v.null()` return validator requires the literal `null`, not `undefined`
    return null
  },
  returns: v.null(),
})

/**
 * Wipe every task in this deployment, `clearBatchSize` rows at a time (rescheduling itself while
 * rows remain) to stay under Convex's per-mutation write limit. Safe to expose with no
 * confirmation-token/ownership check beyond "you can reach this URL" because each deployment is
 * single-tenant by construction — this backs the Settings page's explicit "delete my synced data" action.
 */
export const clearAllTasks = mutation({
  handler: async ctx => {
    const rows = await ctx.db.query('tasks').take(clearBatchSize)
    // oxlint-disable-next-line no-underscore-dangle -- `_id` is Convex's own generated field name, not ours to rename
    await Promise.all(rows.map(row => ctx.db.delete(row._id)))
    if (rows.length === clearBatchSize) await ctx.scheduler.runAfter(0, api.tasks.clearAllTasks, {})
    // oxlint-disable-next-line unicorn/no-null -- Convex's `v.null()` return validator requires the literal `null`, not `undefined`
    return null
  },
  returns: v.null(),
})
