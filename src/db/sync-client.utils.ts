import { Result } from 'shuutils'
import { api } from '../../convex/_generated/api'

/**
 * The schema version this build of the app expects from a Convex sync deployment.
 * Must match `schemaVersion` in `convex/tasks.ts` — bump both together on a breaking schema change.
 */
export const expectedSchemaVersion = 1

export type SyncUrlCheckResult = { ok: true } | { ok: false; reason: 'stale-schema' | 'unreachable' }

/**
 * Validate a user-supplied Convex sync URL by calling its `health` query. Distinguishes an
 * unreachable/wrong URL (the call itself fails — network error, not a Convex deployment, or a
 * deployment that never had this template's `convex/` functions) from a reachable deployment
 * running an older schema version (the call succeeds, but `schemaVersion` predates this build).
 * @param url - the Convex deployment URL pasted by the user
 * @returns whether the URL is a valid, up-to-date WhatNow sync deployment, and why not if not
 */
export async function checkSyncUrl(url: string): Promise<SyncUrlCheckResult> {
  const attempt = async () => {
    // dynamically imported (rather than at module scope) so this ~20KB client stays out of the
    // initial bundle — it's only needed once the user actually enters a sync url in Settings
    const { ConvexHttpClient } = await import('convex/browser')
    return new ConvexHttpClient(url).query(api.tasks.health, {})
  }
  const result = await Result.trySafe(attempt())
  if (!result.ok) return { ok: false, reason: 'unreachable' }
  if (result.value.schemaVersion !== expectedSchemaVersion) return { ok: false, reason: 'stale-schema' }
  return { ok: true }
}

/**
 * Wipe every task on the given deployment (the Settings page's explicit "delete my synced data"
 * action). One-shot call, safe with `ConvexHttpClient` — no live subscription involved.
 * @param url - the Convex deployment URL to wipe
 * @returns whether the wipe succeeded
 */
export async function deleteSyncedData(url: string): Promise<{ ok: boolean }> {
  const attempt = async () => {
    const { ConvexHttpClient } = await import('convex/browser')
    return new ConvexHttpClient(url).mutation(api.tasks.clearAllTasks, {})
  }
  const result = await Result.trySafe(attempt())
  return { ok: result.ok }
}
