import { useEffect } from 'react'
import { type SyncStatus, syncStatusLabel } from '../db/sync-status'
import { useAppStore } from '../store/use-app-store'

/** sync states worth a glanceable note when online — 'off' and 'synced' are the common, unremarkable states and stay silent, matching the design's "near-zero net-new UI surface" intent */
const noteworthySyncStatuses = new Set<SyncStatus>(['connecting', 'error', 'syncing'])

/**
 * @param hasSyncUrl - whether cross-device sync is configured
 * @returns the extra sentence fragment appended to the offline text, or an empty string when sync isn't configured
 */
function offlineSyncNote(hasSyncUrl: boolean) {
  return hasSyncUrl ? ' — sync will resume when back online' : ''
}

/**
 * Computes the connectivity note (offline warning or noteworthy sync state), which always takes
 * priority over a page's own status text -- it's the more urgent, cross-cutting concern.
 * @param isOffline - whether the browser currently reports offline
 * @param syncUrl - the configured sync URL, empty string when sync is off
 * @param syncStatus - the live sync status
 * @returns the connectivity note, or an empty string when there's nothing worth surfacing
 */
function connectivityNote(isOffline: boolean, syncUrl: string, syncStatus: SyncStatus): string {
  const hasSyncUrl = syncUrl !== ''
  if (isOffline) return `You're offline, changes are saved on this device${offlineSyncNote(hasSyncUrl)}`
  if (hasSyncUrl && noteworthySyncStatuses.has(syncStatus)) {
    const label = syncStatusLabel[syncStatus]
    return label.charAt(0).toUpperCase() + label.slice(1)
  }
  return ''
}

/**
 * Publishes a page's status text to the shared app status (see src/components/status.tsx) --
 * every page that renders <Status/> calls this, optionally with its own text (task progress, for
 * instance). The connectivity note (offline/sync) always takes priority when present, and since
 * only one page is ever mounted at a time, there's never more than one writer active at once.
 * @param pageText - the page's own status text, shown when there's no connectivity note to surface
 */
export function useAppStatus(pageText = ''): void {
  const isOffline = useAppStore(state => state.isOffline)
  const syncUrl = useAppStore(state => state.data.settings.syncUrl)
  const syncStatus = useAppStore(state => state.syncStatus)
  const setStatus = useAppStore(state => state.setStatus)
  const text = connectivityNote(isOffline, syncUrl, syncStatus) || pageText
  useEffect(() => {
    setStatus(text)
  }, [text, setStatus])
  // clears the shared status on unmount only (not on every text change, which would otherwise
  // flash the reserved space empty between renders)
  useEffect(() => () => setStatus(''), [setStatus])
}
