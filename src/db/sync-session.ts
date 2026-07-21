import type { ConvexReactClient } from 'convex/react'
import { Result } from 'shuutils'
import { api } from '../../convex/_generated/api'
import type { Task } from '../schemas/task'
import { useAppStore } from '../store/use-app-store'
import { logger } from '../utils/logger.utils'
import { mergeTask } from '../utils/tasks.utils'
import type { SyncStatus } from './sync-status'

/**
 * Compare every app-shape field of two tasks, used as the "did this actually change" echo guard:
 * only tasks whose merged result differs from the current local copy are written back to the
 * store, so a device's own push echoing back through the subscription doesn't re-trigger a store
 * update (wasted render, and a risk of feeding back into the push effect).
 * @param taskA - one task
 * @param taskB - the other task, compared field by field against `taskA`
 * @returns whether every app-shape field matches
 */
function areTasksEqual(taskA: Task, taskB: Task): boolean {
  return (
    taskA.completedOn === taskB.completedOn &&
    taskA.createdOn === taskB.createdOn &&
    taskA.deletedOn === taskB.deletedOn &&
    taskA.id === taskB.id &&
    taskA.isDone === taskB.isDone &&
    taskA.minutes === taskB.minutes &&
    taskA.name === taskB.name &&
    taskA.once === taskB.once &&
    taskA.reason === taskB.reason &&
    taskA.syncedAt === taskB.syncedAt &&
    taskA.updatedOn === taskB.updatedOn
  )
}

/**
 * Write merged tasks back into the store via `mergeTasks`, which patches existing tasks by id and
 * appends any with no existing local match — exactly what adopting a brand-new remote-only task
 * needs (plain `updateTasks` only patches ids already present, by design — see `use-app-store.ts`).
 * @param mergedTasks - tasks whose merged result differs from the current local copy
 */
function applyMergedTasks(mergedTasks: Task[]) {
  useAppStore.getState().mergeTasks(mergedTasks)
}

/**
 * A task's `syncedAt` for comparison purposes, falling back to `updatedOn`/`createdOn` when it's
 * still `''` — either a brand-new task (`createTask` doesn't stamp `syncedAt`) or one created
 * before this field existed. Without this fallback, `'' > ''` is always false, so such a task's
 * confirmed watermark would forever equal its own `syncedAt` and it would never get pushed.
 * @param task - the task to read a comparable timestamp from
 * @returns `syncedAt` if set, else `updatedOn` if set, else `createdOn`
 */
function effectiveSyncedAt(task: Task): string {
  return task.syncedAt || task.updatedOn || task.createdOn
}

/**
 * Read a `Watch`'s current value, turning a thrown server-side query error into a discriminated
 * result instead of an uninitialized `let` + try/catch at the call site — reuses the same
 * `Result.trySafe` pattern as `sync-client.utils.ts` rather than a bespoke try/catch shape.
 * @param watch - the live `Watch<Task[]>` returned by `client.watchQuery`
 * @returns the current tasks (possibly `undefined` if no result has arrived yet), or the error
 */
function readWatchResult(watch: ReturnType<ConvexReactClient['watchQuery']>) {
  return Result.trySafe(() => watch.localQueryResult() as Task[] | undefined)
}

/**
 * How long to wait for the first subscription tick before giving up on `'connecting'` and
 * reporting `'error'` instead. Convex has no public callback for the case this guards against — a
 * deployment that rejects the connection outright (e.g. an unparseable deployment name) sends a
 * server "FatalError", which the client logs, then calls its own `webSocketManager.terminate()`
 * (confirmed in `node_modules/convex/dist/cjs/browser/sync/web_socket_manager.js`: `terminate()`
 * closes with a normal/expected close code, which `onServerDisconnectError` explicitly ignores) —
 * so neither `onServerDisconnectError` nor `watchQuery`'s `onUpdate` ever fires again, and without
 * this timeout `SyncSession` would report `'connecting'` forever with no way for the user to tell a
 * dead deployment from a slow one. Generous relative to a real deployment's typical sub-second
 * handshake; self-correcting if a genuinely slow connection completes after the timeout fires (the
 * next `applyRemoteSnapshot` sets `hasConnected = true` and overrides it).
 */
export const connectTimeoutMs = 10_000

/**
 * Owns one live connection to a Convex sync deployment: the `getAllTasks` subscription (merge
 * remote into local) and pushing local edits (`upsertTask`) as they happen, plus the derived
 * `SyncStatus`. A fresh instance is created whenever `useSync`'s `syncUrl` changes and disposed on
 * teardown — see `disposeWatch`/`unsubscribeTasks`/`client.close()` in `dispose()`.
 *
 * Split out of the `useSync` effect body (rather than one large inline closure) purely to keep
 * each piece under the repo's `max-lines-per-function` lint budget; the logic itself is exactly
 * what's described in `use-sync.ts`'s own doc comment (the imperative subscription API, the merge
 * loop that also handles first-connection reconciliation, and the reload-resilience reasoning).
 */
export class SyncSession {
  private readonly client: ConvexReactClient
  // last `syncedAt` per task id that both sides are already known to agree on, either because we
  // just pushed it successfully or because we just merged it in from a remote update ; only moved
  // forward (never regressed) so a stale/out-of-order remote snapshot can never suppress a push of
  // a genuinely newer local edit that's already in flight
  private readonly confirmedSyncedAt: Map<string, string>
  private readonly inFlightPushIds = new Set<string>()
  private readonly onStatusChange: (status: SyncStatus) => void
  private readonly syncUrl: string
  private connectTimeoutId: ReturnType<typeof setTimeout> | undefined = undefined
  private disposeWatch: (() => void) | undefined = undefined
  private hasConnected = false
  private hasError = false
  private isCancelled = false
  private unsubscribeTasks: (() => void) | undefined = undefined

  public constructor(options: { client: ConvexReactClient; confirmedSyncedAt: Map<string, string>; onStatusChange: (status: SyncStatus) => void; syncUrl: string }) {
    this.client = options.client
    this.syncUrl = options.syncUrl
    this.confirmedSyncedAt = options.confirmedSyncedAt
    this.onStatusChange = options.onStatusChange
  }

  /**
   * Start the remote subscription and the local-tasks watcher. Both sides independently converge
   * on the same union via `syncedAt` comparisons — see the "no separate first-connection mode"
   * design note on `useSync` — so starting both here, once, handles both steady-state sync and the
   * very first reconciliation.
   */
  public start(): void {
    const watch = this.client.watchQuery(api.tasks.getAllTasks, {})
    this.disposeWatch = watch.onUpdate(() => this.handleRemoteUpdate(watch))
    // the watch may already have a cached result (e.g. a fast reconnect) that onUpdate won't
    // re-announce on its own — check once eagerly so we don't miss it
    this.handleRemoteUpdate(watch)

    this.unsubscribeTasks = useAppStore.subscribe(
      state => state.data.tasks,
      tasks => this.pushChangedTasks(tasks),
    )
    this.pushChangedTasks(useAppStore.getState().data.tasks)

    this.connectTimeoutId = setTimeout(() => this.handleConnectTimeout(), connectTimeoutMs)
    this.recomputeStatus()
  }

  /** Tear down the subscription, the store watcher, and close the underlying client connection. */
  public dispose(): void {
    this.isCancelled = true
    clearTimeout(this.connectTimeoutId)
    this.disposeWatch?.()
    this.unsubscribeTasks?.()
    void this.client.close()
  }

  /**
   * Bump the confirmed-synced watermark for a task id, but only forward — never regress it, so an
   * async remote snapshot that predates a local edit already being pushed can't make that edit
   * look "already synced" and get silently skipped.
   * @param id - the task id
   * @param syncedAt - the `syncedAt` value both sides now agree on for this id
   */
  private bumpConfirmedSyncedAt(id: string, syncedAt: string): void {
    const current = this.confirmedSyncedAt.get(id)
    if (current === undefined || syncedAt > current) this.confirmedSyncedAt.set(id, syncedAt)
  }

  /**
   * Merge one subscription snapshot into the local store, adopting brand-new remote tasks and
   * skipping (echo guard) any task whose merged result is unchanged from the current local copy.
   * @param remoteTasks - every task currently on the deployment, per `getAllTasks`
   */
  private applyRemoteSnapshot(remoteTasks: Task[]): void {
    clearTimeout(this.connectTimeoutId)
    this.hasConnected = true
    this.hasError = false
    const localById = new Map(useAppStore.getState().data.tasks.map(task => [task.id, task]))
    const changedTasks: Task[] = []
    for (const remoteTask of remoteTasks) {
      const localTask = localById.get(remoteTask.id)
      const mergedTask = localTask === undefined ? remoteTask : mergeTask(localTask, remoteTask)
      this.bumpConfirmedSyncedAt(mergedTask.id, effectiveSyncedAt(mergedTask))
      if (localTask === undefined || !areTasksEqual(localTask, mergedTask)) changedTasks.push(mergedTask)
    }
    if (changedTasks.length > 0) applyMergedTasks(changedTasks)
    this.recomputeStatus()
  }

  /**
   * React to a subscription tick: read the watch's current value (throws if the server-side query
   * errored) and hand any real snapshot off to `applyRemoteSnapshot`.
   * @param watch - the live `Watch<Task[]>` returned by `client.watchQuery`
   */
  private handleRemoteUpdate(watch: ReturnType<ConvexReactClient['watchQuery']>): void {
    const outcome = readWatchResult(watch)
    if (!outcome.ok) {
      logger.error('convex sync subscription reported an error', { error: outcome.error, syncUrl: this.syncUrl })
      this.hasError = true
      this.recomputeStatus()
      return
    }
    if (outcome.value !== undefined) this.applyRemoteSnapshot(outcome.value)
  }

  /**
   * Push every task whose local `syncedAt` has moved past its confirmed watermark. Called on
   * connect (with the store's current tasks) and again whenever the store's task array changes.
   * @param tasks - the full current local tasks array
   */
  private pushChangedTasks(tasks: Task[]): void {
    for (const task of tasks) {
      if (this.inFlightPushIds.has(task.id)) continue
      const confirmed = this.confirmedSyncedAt.get(task.id) ?? ''
      if (effectiveSyncedAt(task) > confirmed) void this.pushTask(task)
    }
  }

  /**
   * Push a single task via `upsertTask`, a one-shot call (unlike the subscription, Convex doesn't
   * retry this for us), so failures are caught and logged here explicitly.
   * @param task - the task to push
   */
  private async pushTask(task: Task): Promise<void> {
    this.inFlightPushIds.add(task.id)
    this.recomputeStatus()
    try {
      await this.client.mutation(api.tasks.upsertTask, task)
      this.bumpConfirmedSyncedAt(task.id, effectiveSyncedAt(task))
      this.hasError = false
    } catch (error) {
      logger.error('failed to push task to convex sync deployment', { error, syncUrl: this.syncUrl, taskId: task.id })
      this.hasError = true
    } finally {
      this.inFlightPushIds.delete(task.id)
      this.recomputeStatus()
    }
  }

  /**
   * Fires `connectTimeoutMs` after `start()` if the first subscription tick still hasn't arrived —
   * see `connectTimeoutMs`'s doc comment for why Convex gives us no direct callback for this case.
   * A no-op if a snapshot already arrived (`applyRemoteSnapshot` clears this timer) or a real
   * subscription error already reported (redundant with the existing `'error'` status).
   */
  private handleConnectTimeout(): void {
    if (this.hasConnected || this.hasError) return
    logger.error('convex sync deployment never completed its first subscription tick', { syncUrl: this.syncUrl, timeoutMs: connectTimeoutMs })
    this.hasError = true
    this.recomputeStatus()
  }

  /** Recompute and publish the current `SyncStatus` from this session's internal flags. */
  private recomputeStatus(): void {
    if (this.isCancelled) return
    if (this.hasError) {
      this.onStatusChange('error')
      return
    }
    if (!this.hasConnected) {
      this.onStatusChange('connecting')
      return
    }
    this.onStatusChange(this.inFlightPushIds.size > 0 ? 'syncing' : 'synced')
  }
}
