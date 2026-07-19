import { isNil } from 'es-toolkit'
import { z } from 'zod/v4'
import { defaultSettings, SettingsSchema } from './settings'
import { maxTasks, TaskSchema } from './task'

export const AppDataSchema = z
  .object({
    settings: SettingsSchema.default(defaultSettings),
    tasks: z.array(TaskSchema).max(maxTasks).default([]),
  })
  .superRefine((data, ctx) => {
    const seenIds = new Set<string>()
    for (const [index, task] of data.tasks.entries())
      if (seenIds.has(task.id)) ctx.addIssue({ code: 'custom', message: `Duplicate task id: ${task.id}`, path: ['tasks', index, 'id'] })
      else seenIds.add(task.id)
  })

export type AppData = z.infer<typeof AppDataSchema>

export const defaultAppData: AppData = { settings: defaultSettings, tasks: [] }

/**
 * Best-effort recovery for a stored document that fails full validation: keeps valid settings and
 * drops only the individual tasks that don't parse, so one corrupt task can't wipe every task.
 * @param raw the unknown data read from storage
 * @returns a valid AppData, keeping as much of the original data as possible
 */
export function recoverAppData(raw: unknown): AppData {
  const record = !isNil(raw) && typeof raw === 'object' ? (raw as { settings?: unknown; tasks?: unknown }) : {}
  const settings = SettingsSchema.safeParse(record.settings)
  const rawTasks = Array.isArray(record.tasks) ? record.tasks : []
  const seenIds = new Set<string>()
  const tasks = rawTasks
    .map(task => TaskSchema.safeParse(task))
    .filter(result => result.success)
    .map(result => result.data)
    .filter(task => {
      if (seenIds.has(task.id)) return false
      seenIds.add(task.id)
      return true
    })
  return { settings: settings.success ? settings.data : defaultSettings, tasks }
}

/**
 * Safely parse a JSON string into a validated AppData
 * @param text the JSON string to parse
 * @returns an object with either the parsed data or a human-readable error
 */
export function safeImportJson(text: string): { data: AppData } | { error: string } {
  let parsed: unknown = undefined
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    /* v8 ignore next -- JSON.parse always throws an Error, the String(error) fallback is unreachable */
    const detail = error instanceof Error ? error.message : String(error)
    return { error: `Invalid JSON: ${detail}` }
  }
  const result = AppDataSchema.safeParse(parsed)
  if (!result.success) {
    const messages = result.error.issues.map(issue => `Schema error at ${issue.path.join('.')}: ${issue.message}`)
    return { error: messages.join('\n') }
  }
  return { data: result.data }
}
