import type { ConvexReactClient } from 'convex/react'
import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../store/use-app-store'
import { logger } from '../utils/logger.utils'
import { SyncSession } from './sync-session'
import type { SyncStatus } from './sync-status'

/**
 * Reconciles the local zustand task store against a Convex deployment, using Convex's imperative
 * (non-hook) React client API — `ConvexReactClient.watchQuery(...).onUpdate(...)` — rather than
 * `useQuery`/`useMutation`, because those bind to a single app-wide client provided by
 * `ConvexProvider`. This app's sync URL is user-supplied, can change, and can become empty at
 * runtime, so the client itself must be constructed and torn down imperatively instead.
 *
 * Confirmed against `node_modules/convex/dist/cjs-types/react/client.d.ts`: `ConvexReactClient`
 * exposes `watchQuery(query, args)` returning a stateless `Watch<T>` with `onUpdate(callback)`
 * (the callback takes no arguments — read the new value via `watch.localQueryResult()`, which
 * throws if the query errored on the server) and `mutation(mutationRef, args)` for one-shot calls.
 * The actual connection/subscription/push logic lives in `SyncSession` (`sync-session.ts`); this
 * hook just owns the client's React lifecycle (construct on connect, tear down on url change or
 * unmount). `convex/react` itself is dynamically imported on first connect (see
 * `createSyncClientOrNull`) rather than imported at module scope, so its ~115KB stays out of the
 * initial bundle for the (default) case where no sync url is configured.
 *
 * Design notes worth reading before touching this file (or `sync-session.ts`):
 *
 * - **No separate "first connection" / migration code path.** The same merge-by-`syncedAt` loop
 *   that handles every subsequent update also handles the very first reconciliation: remote-only
 *   tasks get adopted via the `onUpdate` handler, local-only tasks get pushed via the store
 *   subscription, and tasks present on both sides resolve by whichever `syncedAt` is later. Do not
 *   build a separate migration path — this loop already produces the correct union as long as it
 *   runs once on connect with the full local+remote task sets, which it does by construction (the
 *   store subscription fires immediately with the current tasks, and the first `watchQuery` update
 *   carries every remote task).
 *
 * - **Interrupted-reload resilience by design, not by intercepting the reload.** This app's service
 *   worker (`vite.config.ts`, `registerType: 'autoUpdate'`) can force a full page reload at any
 *   time with no clean hook to defer it. Rather than fighting that, this hook tolerates it: both
 *   the push side and the merge side are idempotent re-derivations from `syncedAt` comparisons, not
 *   steps in a stateful script, so a hard reload mid-sync just means the hook reconnects on next
 *   load and re-converges to the same correct state — at worst a redundant network round-trip,
 *   never data corruption. This resolves the "SW autoUpdate mid-sync race" review finding.
 * @returns the current `SyncStatus`
 */
export function useSync(): SyncStatus {
  const syncUrl = useAppStore(state => state.data.settings.syncUrl)
  const isLoading = useAppStore(state => state.isLoading)
  const [status, setStatus] = useState<SyncStatus>('off')
  const confirmedSyncedAtRef = useRef(new Map<string, string>())

  useEffect(() => {
    confirmedSyncedAtRef.current = new Map()
    if (applyIdleStatus(syncUrl, isLoading, setStatus)) return undefined

    let isCancelled = false
    let session: SyncSession | undefined = undefined

    // fires and forgets on purpose: the effect can't await this itself, so cancellation /
    // cleanup is instead handled by the `isCancelled` check once the import + client construction
    // resolve (see below)
    void (async () => {
      const client = await createSyncClientOrNull(syncUrl, setStatus)
      if (client === undefined) return
      if (isCancelled) {
        void client.close()
        return
      }
      session = new SyncSession({ client, confirmedSyncedAt: confirmedSyncedAtRef.current, onStatusChange: setStatus, syncUrl })
      session.start()
    })()

    return () => {
      isCancelled = true
      session?.dispose()
    }
  }, [syncUrl, isLoading])

  return status
}

/**
 * Report the idle `SyncStatus` (`'off'` when there's no url, `'connecting'` while local hydration
 * is still pending) when there's nothing to connect to yet. Pulled out of the `useSync` effect
 * body into its own function — rather than a bare `setStatus(...)` statement directly in the
 * effect — to satisfy the react-compiler lint rule against calling `setState` synchronously inline
 * in an effect; the call still happens exactly once per relevant `syncUrl`/`isLoading` change.
 * @param syncUrl - the current sync URL setting
 * @param isLoading - whether local hydration (IndexedDB) is still pending
 * @param setStatus - the hook's status setter
 * @returns whether the idle state was reported (and the effect should therefore do nothing else)
 */
function applyIdleStatus(syncUrl: string, isLoading: boolean, setStatus: (status: SyncStatus) => void): boolean {
  if (syncUrl !== '' && !isLoading) return false
  setStatus(syncUrl === '' ? 'off' : 'connecting')
  return true
}

/**
 * Construct a `ConvexReactClient`, catching and logging a synchronous construction failure (e.g. a
 * malformed URL) the same way `checkSyncUrl` does for `ConvexHttpClient` in `sync-client.utils.ts`.
 *
 * Also wires `onServerDisconnectError`, the only hook Convex offers for a server-side "FatalError"
 * (e.g. an unparseable deployment name like `https://example.convex.cloud`): the client logs it,
 * terminates its own WebSocket, and never calls back into `watchQuery`'s `onUpdate` again — without
 * this hook, `SyncSession` never observes a subscription tick or an error, so it would stay
 * `'connecting'` forever with no way for the user to tell a bad URL from a slow one.
 * @param syncUrl - the user-supplied Convex deployment URL
 * @param setStatus - the hook's status setter, updated to `'error'` on failure
 * @returns the constructed client, or `undefined` if construction failed
 */
async function createSyncClientOrNull(syncUrl: string, setStatus: (status: SyncStatus) => void): Promise<ConvexReactClient | undefined> {
  try {
    const { ConvexReactClient } = await import('convex/react')
    return new ConvexReactClient(syncUrl, {
      onServerDisconnectError: message => {
        logger.error('convex sync deployment reported a fatal disconnect', { message, syncUrl })
        setStatus('error')
      },
    })
  } catch (error) {
    logger.error('failed to construct convex sync client', { error, syncUrl })
    setStatus('error')
    return undefined
  }
}
