import { useNow } from '../hooks/use-now'
import { formatClockDate, formatClockTime } from '../utils/screensaver.utils'
import { ScreensaverBubbles } from './screensaver-bubbles'

/**
 * The screensaver shown once every task is done : a dimmed clock with the date in small, over very slow pale green bubbles.
 * @param props - the component props
 * @param props.accent - the css color of the success progress
 * @returns the clock screensaver
 */
export function ScreensaverClock({ accent }: { accent: string }) {
  const now = useNow()
  return (
    <div className="absolute inset-0 overflow-hidden" data-testid="screensaver-clock">
      <ScreensaverBubbles accent={accent} isCalm />
      <div className="relative flex h-full flex-col items-center justify-center gap-[1.5vmin] opacity-70">
        <div className="text-[min(40vw,45vh)] leading-none font-light tracking-tight tabular-nums" data-testid="screensaver-clock-time">
          {formatClockTime(now)}
        </div>
        <div className="text-[min(5.5vw,6.8vh)] font-light opacity-60 first-letter:uppercase" data-testid="screensaver-clock-date">
          {formatClockDate(now)}
        </div>
      </div>
    </div>
  )
}
