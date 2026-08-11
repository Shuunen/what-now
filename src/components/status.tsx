import { useAppStore } from '../store/use-app-store'

/**
 * The app's single line of textual feedback -- dumb by design, it just reflects
 * `store.status`, one plain string with no error/info/progress distinction. Any
 * part of the app calls `setStatus` (usually via the `useAppStatus` hook) to
 * update it ; used once per page so there's only ever one on screen.
 * @returns the status element
 */
export function Status() {
  const status = useAppStore(state => state.status)
  // oxlint-disable-next-line unicorn/no-null
  if (!status) return null
  return (
    <div className="flex flex-col text-lg font-light text-white/60 italic transition-colors ease-in-out" data-testid="status">
      {status}
    </div>
  )
}
