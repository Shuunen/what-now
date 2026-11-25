import { useNow } from '../hooks/use-now'
import type { Task } from '../schemas/task'
import { useAppStore } from '../store/use-app-store'
import { computeProgressPercent, progressAccentColor } from '../utils/progress.utils'
import { countRemaining, isNightTime } from '../utils/screensaver.utils'
import { ScreensaverClock } from './screensaver-clock'
import { ScreensaverCountdown } from './screensaver-countdown'

const successPercent = 100

/**
 * What the screensaver shows : the clock once every task is done or during the night, otherwise the remaining task count.
 * It follows the time, so it switches by itself when the night starts or ends.
 * @param props - the component props
 * @param props.tasks - the tasks of the day
 * @returns the clock or the countdown
 */
export function ScreensaverBody({ tasks }: { tasks: Task[] }) {
  const nightStart = useAppStore(state => state.data.settings.nightStart)
  const nightEnd = useAppStore(state => state.data.settings.nightEnd)
  const now = useNow()
  const remaining = countRemaining(tasks)
  if (remaining === 0 || isNightTime(now, nightStart, nightEnd)) return <ScreensaverClock accent={progressAccentColor(successPercent)} />
  return <ScreensaverCountdown accent={progressAccentColor(computeProgressPercent(tasks))} remaining={remaining} />
}
