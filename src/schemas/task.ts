import { z } from 'zod/v4'

/** Upper bound on the number of tasks an import may contain, to avoid pathological payloads. */
export const maxTasks = 10_000

/** Upper bound on task text fields, mirroring the UI inputs' maxLength so imports can't bypass it. */
const maxTaskTextLength = 150

export const TaskSchema = z.object({
  /** iso10 date the task was last completed on, empty string if never completed @example "2025-01-26" */
  completedOn: z.string().default(''),
  /** iso date-time the task was created on, empty string if unknown (e.g. imported before this field existed) @example "2025-01-26T10:00:00.000Z" */
  createdOn: z.string().default(''),
  /** iso date-time the task was deleted on, empty string when not deleted. Tasks are soft-deleted (kept in storage, hidden from every view) so cross-device sync can propagate the deletion without resurrecting the task from a stale remote copy. @example "2025-01-26T10:00:00.000Z" */
  deletedOn: z.string().default(''),
  /** the id of the task @example "id-123" */
  id: z.string().min(1),
  /** true if the task is completely done (one-time task or a recurring task that should not be done anymore) */
  isDone: z.boolean().default(false),
  /** the average time to complete the task in minutes */
  minutes: z.number().nonnegative().default(0),
  /** the task label @example "ranger un truc qui traîne" */
  name: z.string().min(1).max(maxTaskTextLength),
  /** the frequency of the task @example "day", "2-months", "yes" */
  once: z.string().default('day'),
  /** the reason to take time and energy to do this task :) */
  reason: z.string().max(maxTaskTextLength).optional(),
  /** iso date-time this task was last written on, for any reason (completion toggle, edit, or deletion) — the single clock used for cross-device sync conflict resolution. Distinct from `updatedOn`, which only tracks name/frequency/reason/minutes edits for quote-attribution display. @example "2025-01-26T10:00:00.000Z" */
  syncedAt: z.string().default(''),
  /** iso date-time the name, frequency, reason or minutes was last edited on, empty string when never edited since creation @example "2025-01-26T10:00:00.000Z" */
  updatedOn: z.string().default(''),
})

export type Task = z.infer<typeof TaskSchema>
