import { useAppStore } from '../store/use-app-store'
import { TimeField } from './time-field'

/**
 * The night of the screensaver : from the start time until the end time it only shows the clock, even when tasks are left.
 * It reads its initial times from the store, so remount it (with a key) once the stored data has loaded.
 * @returns the setting section element
 */
export function NightSetting() {
  const nightStart = useAppStore(state => state.data.settings.nightStart)
  const nightEnd = useAppStore(state => state.data.settings.nightEnd)
  const setNightStart = useAppStore(state => state.setNightStart)
  const setNightEnd = useAppStore(state => state.setNightEnd)
  // disabled while hydrating, like the other settings, an edit made here would be overwritten when the stored data lands
  const isLoading = useAppStore(state => state.isLoading)
  return (
    <section className="flex w-full max-w-md flex-col gap-3" data-testid="setting-night">
      <div className="flex flex-col gap-1 text-sm font-medium">
        Night clock
        <span className="font-normal text-white/60">
          From the start time until the end time, the screensaver only shows the clock, even when tasks are left, so nobody stares at a bouncing logo all night. The same time twice turns it off.
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <TimeField disabled={isLoading} id="input-night-start" label="From" onSave={setNightStart} saved={nightStart} />
        <TimeField disabled={isLoading} id="input-night-end" label="until" onSave={setNightEnd} saved={nightEnd} />
      </div>
    </section>
  )
}
