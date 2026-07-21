// oxlint-disable react/no-multi-comp
import { type SyncStatus, syncStatusLabel } from '../db/sync-status'
import { useAppStore } from '../store/use-app-store'

/** sync states worth a glanceable indicator when online — 'off' and 'synced' are the common, unremarkable states and stay silent, matching the design's "near-zero net-new UI surface" intent */
const noteworthySyncStatuses = new Set<SyncStatus>(['connecting', 'error', 'syncing'])

/**
 * Extends the offline warning's text with a sync-specific note, reusing the same component/testid
 * shipped in PR #493 rather than adding a new one — see the data-sync design doc's Accepted Scope.
 * @param hasSyncUrl - whether cross-device sync is configured
 * @returns the extra sentence fragment, or an empty string when sync isn't configured
 */
function offlineSyncNote(hasSyncUrl: boolean) {
  return hasSyncUrl ? ' — sync will resume when back online' : ''
}

/**
 * A small, glance-able indicator for sync activity while online — only rendered for states worth a
 * user's attention (connecting, actively syncing, or erroring); the common good states (off,
 * synced) stay silent.
 * @returns the indicator element, or null when there's nothing worth surfacing
 */
function SyncIndicator() {
  const syncUrl = useAppStore(state => state.data.settings.syncUrl)
  const syncStatus = useAppStore(state => state.syncStatus)
  // oxlint-disable-next-line unicorn/no-null
  if (syncUrl === '' || !noteworthySyncStatuses.has(syncStatus)) return null
  return (
    <div className="rounded bg-primary/20 px-3 py-1 text-center text-sm font-semibold text-primary-accent" data-testid="sync-indicator" role="status">
      {syncStatusLabel[syncStatus]}
    </div>
  )
}

export function OfflineWarning({ isOffline }: { isOffline: boolean }) {
  const syncUrl = useAppStore(state => state.data.settings.syncUrl)
  return (
    <>
      {isOffline && (
        <div className="rounded bg-amber-500/20 px-3 py-1 text-center text-sm font-semibold text-amber-300" data-testid="offline-warning" role="status">
          You&apos;re offline, changes are saved on this device{offlineSyncNote(syncUrl !== '')}
        </div>
      )}
      {!isOffline && <SyncIndicator />}
    </>
  )
}
