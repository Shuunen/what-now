import { useNow } from '../hooks/use-now'
import { formatClockDate, formatClockTime } from '../utils/screensaver.utils'
import { ScreensaverBubbles } from './screensaver-bubbles'

/**
 * The screensaver shown once every task is done, or during the night : a dimmed clock with the date in small, over very slow pale green bubbles. At night the background is pure black, without bubbles, and the clock is four times as dim as the one shown when every task is done.
 * @param props - the component props
 * @param props.isNight - the night clock, four times as dim as the clock shown when every task is done
 * @param props.percent - the progress percent, 100 once every task is done
 * @returns the clock screensaver
 */
export function ScreensaverClock({ isNight, percent }: { isNight: boolean; percent: number }) {
  const now = useNow()
  return (
    <div className={`absolute inset-0 overflow-hidden ${isNight ? 'bg-black' : ''}`} data-testid="screensaver-clock">
      {!isNight && <ScreensaverBubbles isCalm percent={percent} />}
      <div className={`relative flex h-full flex-col items-center justify-center gap-[1.5vmin] ${isNight ? 'opacity-[0.175]' : 'opacity-70'}`} data-testid="screensaver-clock-content">
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
