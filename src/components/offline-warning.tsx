export function OfflineWarning({ isOffline }: { isOffline: boolean }) {
  // oxlint-disable-next-line unicorn/no-null
  if (!isOffline) return null
  return (
    <div className="rounded bg-amber-500/20 px-3 py-1 text-center text-sm font-semibold text-amber-300" data-testid="offline-warning" role="status">
      You&apos;re offline, changes are saved on this device
    </div>
  )
}
