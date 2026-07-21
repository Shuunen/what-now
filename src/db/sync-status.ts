/**
 * The single source of truth for sync state, read by `useSync` (which computes it), the Settings
 * page's status text, and the app's offline indicator — never duplicate this list.
 */
export type SyncStatus = 'connecting' | 'error' | 'off' | 'synced' | 'syncing'

/**
 * The single source of truth for human-readable sync status text, shared by the Settings page and
 * the offline indicator so the two surfaces never drift — see the data-sync design doc's Accepted
 * Scope note on the offline indicator extension.
 */
export const syncStatusLabel: Record<SyncStatus, string> = {
  connecting: 'Connecting to sync…',
  error: 'Sync error, retrying…',
  off: 'Sync off',
  synced: 'Synced',
  syncing: 'Syncing…',
}
