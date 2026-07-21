import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

/**
 * Single-tenant "What Now" sync template.
 *
 * Each end user deploys this exact `convex/` directory to their OWN free Convex
 * project (`npx convex dev` / `npx convex deploy`) and pastes their deployment
 * URL into the app's Settings page. There is exactly one user's data per
 * deployment, so tasks are NOT scoped by a userId field, and no auth/OAuth is
 * wired up on this side — see the data-sync design doc, Approach D.
 *
 * Tasks are keyed by the app's own generated `id` (a string, e.g. a
 * crypto.randomUUID()), not Convex's own `_id` — the `by_task_id` index exists
 * so upsert/lookup by that app-generated id is O(1) rather than a table scan.
 */
const taskTable = defineTable({
  /** iso10 date the task was last completed on, empty string if never completed */
  completedOn: v.string(),
  /** iso date-time the task was created on, empty string if unknown */
  createdOn: v.string(),
  /** iso date-time the task was deleted on, empty string when not deleted (soft-delete tombstone) */
  deletedOn: v.string(),
  /** the app's own task id (not Convex's `_id`) — unique per task, used for upsert/lookup */
  id: v.string(),
  /** true if the task is completely done */
  isDone: v.boolean(),
  /** the average time to complete the task in minutes */
  minutes: v.number(),
  /** the task label */
  name: v.string(),
  /** the frequency of the task, e.g. "day", "2-months", "yes" */
  once: v.string(),
  /** the reason to take time and energy to do this task, optional */
  reason: v.optional(v.string()),
  /** iso date-time this task was last written on, for any reason — the single LWW sync clock */
  syncedAt: v.string(),
  /** iso date-time the name, frequency, reason or minutes was last edited on, unrelated to sync */
  updatedOn: v.string(),
}).index('by_task_id', ['id'])

// oxlint-disable-next-line import/no-default-export -- Convex requires `schema.ts` to default-export its `defineSchema(...)` result; this is the framework's contract, not a project style choice.
export default defineSchema({ tasks: taskTable })
