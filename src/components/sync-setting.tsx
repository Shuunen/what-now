// oxlint-disable react/no-multi-comp
import { LinkIcon, Trash2Icon, UnlinkIcon } from 'lucide-react'
import { useState } from 'react'
import { checkSyncUrl, deleteSyncedData } from '../db/sync-client.utils'
import { syncStatusLabel, type SyncStatus } from '../db/sync-status'
import { useAppStore } from '../store/use-app-store'
import { toastError, toastSuccess } from '../store/use-toast-store'
import { logger } from '../utils/logger.utils'
import { Button } from './ui/button'

const messageByReason = {
  'stale-schema': 'This deployment is running an older version of the sync schema — redeploy the latest convex/ template from this repo.',
  unreachable: "This doesn't look like a WhatNow sync deployment — check the URL and that you've deployed the template (see the README).",
} as const

/**
 * The disconnected state: a URL input and a "Connect" button that validates the URL against the
 * deployment's health check before persisting it.
 * @param props - the component props
 * @param props.isLoading - disables the input/button while the store is still hydrating
 * @param props.onConnect - called with the validated URL once the health check passes
 * @returns the connect form element
 */
function SyncConnectForm({ isLoading, onConnect }: { isLoading: boolean; onConnect: (url: string) => void }) {
  const [draftUrl, setDraftUrl] = useState('')
  const [isChecking, setIsChecking] = useState(false)

  async function handleConnect() {
    setIsChecking(true)
    const result = await checkSyncUrl(draftUrl)
    setIsChecking(false)
    if (!result.ok) {
      logger.error('sync url validation failed', { reason: result.reason, url: draftUrl })
      toastError(messageByReason[result.reason])
      return
    }
    onConnect(draftUrl)
    setDraftUrl('')
    toastSuccess('Sync connected')
  }

  return (
    <div className="flex gap-3">
      <input
        className="w-full rounded-md border border-white/20 px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isLoading || isChecking}
        id="input-sync-url"
        name="input-sync-url"
        onChange={event => setDraftUrl(event.target.value)}
        placeholder="https://your-project.convex.cloud"
        type="text"
        value={draftUrl}
      />
      <Button disabled={isLoading || isChecking || draftUrl === ''} name="connect-sync" onClick={() => void handleConnect()} variant="outline">
        <LinkIcon className="size-4" />
        {isChecking ? 'Checking…' : 'Connect'}
      </Button>
    </div>
  )
}

/**
 * "Delete my synced data" — wipes every task on the connected deployment. A destructive, one-way
 * action, so it's armed by a first click and only executes on a second confirming click, rather
 * than a real click straight through (no modal component exists in this codebase to reuse).
 * @param props - the component props
 * @param props.syncUrl - the currently-connected sync URL to wipe
 * @returns the delete action element
 */
function DeleteSyncedDataButton({ syncUrl }: { syncUrl: string }) {
  const [isArmed, setIsArmed] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleClick() {
    if (!isArmed) {
      setIsArmed(true)
      return
    }
    setIsDeleting(true)
    const result = await deleteSyncedData(syncUrl)
    setIsDeleting(false)
    setIsArmed(false)
    if (result.ok) {
      toastSuccess('Synced data deleted — your local tasks are untouched')
      return
    }
    logger.error('failed to delete synced data', { syncUrl })
    toastError('Failed to delete synced data — check your connection and try again')
  }

  return (
    <Button disabled={isDeleting} name="delete-synced-data" onClick={() => void handleClick()} variant={isArmed ? 'error' : 'ghost'}>
      <Trash2Icon className="size-4" />
      {isArmed ? 'Confirm delete?' : 'Delete my synced data'}
    </Button>
  )
}

/**
 * The connected state: shows the current sync URL, the live status text, and "Disconnect" /
 * "Delete my synced data" actions.
 * @param props - the component props
 * @param props.isLoading - disables the disconnect button while the store is still hydrating
 * @param props.onDisconnect - called when the user disconnects
 * @param props.syncStatus - the live status reported by useSync (mirrored in the store)
 * @param props.syncUrl - the currently-connected sync URL
 * @returns the connected status element
 */
function SyncConnectedStatus({ isLoading, onDisconnect, syncStatus, syncUrl }: { isLoading: boolean; onDisconnect: () => void; syncStatus: SyncStatus; syncUrl: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="grow truncate">
          <p className="text-sm text-white/80" data-testid="sync-connected-url" title={syncUrl}>
            Synced with {syncUrl}
          </p>
          <p className="text-xs text-white/50" data-testid="sync-status-text">
            {syncStatusLabel[syncStatus]}
          </p>
        </div>
        <Button disabled={isLoading} name="disconnect-sync" onClick={onDisconnect} variant="outline">
          <UnlinkIcon className="size-4" />
          Disconnect
        </Button>
      </div>
      <DeleteSyncedDataButton syncUrl={syncUrl} />
    </div>
  )
}

/**
 * Settings section for connecting to (or disconnecting from) an optional, self-hosted Convex sync
 * deployment. The URL is validated against the deployment's health check before being persisted, so
 * a stored, non-empty `syncUrl` always means a previously-confirmed-valid deployment.
 * @returns the sync setting section element
 */
export function SyncSetting() {
  const syncUrl = useAppStore(state => state.data.settings.syncUrl)
  const setSyncUrl = useAppStore(state => state.setSyncUrl)
  const isLoading = useAppStore(state => state.isLoading)
  const syncStatus = useAppStore(state => state.syncStatus)

  function handleDisconnect() {
    setSyncUrl('')
    toastSuccess('Sync disconnected — your local data is untouched')
  }

  return (
    <section className="flex w-full max-w-md flex-col gap-3" data-testid="setting-sync">
      <label className="flex flex-col gap-1 text-sm font-medium" htmlFor="input-sync-url">
        Cross-device sync (optional)
        <span className="font-normal text-white/60">Paste the URL of a Convex deployment you have deployed from this repo to sync your tasks across devices. Keep it private — anyone with the URL can read and write your synced tasks.</span>
      </label>
      {syncUrl === '' ? <SyncConnectForm isLoading={isLoading} onConnect={setSyncUrl} /> : <SyncConnectedStatus isLoading={isLoading} onDisconnect={handleDisconnect} syncStatus={syncStatus} syncUrl={syncUrl} />}
    </section>
  )
}
