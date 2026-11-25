import { useState } from 'react'
import { maxScreensaverIdleSeconds, minScreensaverIdleSeconds } from '../schemas/settings'
import { useAppStore } from '../store/use-app-store'

/**
 * The delay before the screensaver appears, in seconds. The field keeps its own draft so the user can clear it and retype,
 * and only a valid delay is saved, the draft goes back to the saved value on blur.
 * It reads its initial draft from the store, so remount it (with a key) once the stored data has loaded.
 * @returns the setting section element
 */
export function ScreensaverSetting() {
  const seconds = useAppStore(state => state.data.settings.screensaverIdleSeconds)
  const setSeconds = useAppStore(state => state.setScreensaverIdleSeconds)
  // disabled while hydrating, like the other settings, an edit made here would be overwritten when the stored data lands
  const isLoading = useAppStore(state => state.isLoading)
  const [draft, setDraft] = useState(String(seconds))
  function handleChange(value: string) {
    setDraft(value)
    const parsed = Number(value)
    if (value !== '' && Number.isInteger(parsed) && parsed >= minScreensaverIdleSeconds && parsed <= maxScreensaverIdleSeconds) setSeconds(parsed)
  }
  return (
    <section className="flex w-full max-w-md flex-col gap-3" data-testid="setting-screensaver-delay">
      <label className="flex flex-col gap-1 text-sm font-medium" htmlFor="input-screensaver-delay">
        Screensaver delay (seconds)
        <span className="font-normal text-white/60">
          A moving screensaver shows how many tasks are left (or the clock once they are all done) after this long without a touch, from {minScreensaverIdleSeconds} to {maxScreensaverIdleSeconds} seconds. Touch it to come back to your
          tasks.
        </span>
      </label>
      <input
        className="w-32 rounded-md border border-white/20 px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        data-testid="input-screensaver-delay"
        disabled={isLoading}
        id="input-screensaver-delay"
        inputMode="numeric"
        max={maxScreensaverIdleSeconds}
        min={minScreensaverIdleSeconds}
        name="input-screensaver-delay"
        onBlur={() => setDraft(String(seconds))}
        onChange={event => handleChange(event.target.value)}
        type="number"
        value={draft}
      />
    </section>
  )
}
