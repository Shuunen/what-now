import { useNow } from '../hooks/use-now'
import type { Task } from '../schemas/task'
import { useAppStore } from '../store/use-app-store'
import { computeProgressPercent } from '../utils/progress.utils'
import { countRemaining, isNightTime } from '../utils/screensaver.utils'
import { isTaskActive } from '../utils/tasks.utils'
import { ScreensaverClock } from './screensaver-clock'
import { ScreensaverCountdown } from './screensaver-countdown'

const successPercent = 100

/**
 * What the screensaver shows : the clock once every task is done or during the night, otherwise the remaining task count.
 * It follows the time, so it switches by itself when the night starts or ends.
 * @param props - the component props
 * @param props.tasks - all the tasks, the ones due today are picked here, on every render, so the clock ticking each second also covers a day change
 * @returns the clock or the countdown
 */
export function ScreensaverBody({ tasks: allTasks }: { tasks: Task[] }) {
  const nightStart = useAppStore(state => state.data.settings.nightStart)
  const nightEnd = useAppStore(state => state.data.settings.nightEnd)
  const now = useNow()
  const tasks = allTasks.filter(task => isTaskActive(task, true))
  const remaining = countRemaining(tasks)
  const isNight = isNightTime(now, nightStart, nightEnd)
  if (remaining === 0 || isNight) return <ScreensaverClock isNight={isNight} percent={successPercent} />
  return <ScreensaverCountdown percent={computeProgressPercent(tasks)} remaining={remaining} />
}
