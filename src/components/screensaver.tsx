import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { nbMsInSecond } from 'shuutils'
import { useIdle } from '../hooks/use-idle'
import { useAppStore } from '../store/use-app-store'
import { computeProgressPercent, progressAccentColor } from '../utils/progress.utils'
import { countRemaining } from '../utils/screensaver.utils'
import { isTaskActive } from '../utils/tasks.utils'
import { ScreensaverClock } from './screensaver-clock'
import { ScreensaverCountdown } from './screensaver-countdown'

const successPercent = 100

/**
 * The fake screensaver, for a device that never really sleeps like an Echo Show, so after a while without touch this covers the app :
 * the remaining task count while some are left, a clock once all are done. A tap brings the user back to the tasks list.
 * @returns the screensaver, or nothing when the user is active
 */
export function Screensaver() {
  const idleSeconds = useAppStore(state => state.data.settings.screensaverIdleSeconds)
  const isLoading = useAppStore(state => state.isLoading)
  const allTasks = useAppStore(state => state.data.tasks)
  const navigate = useNavigate()
  const { isIdle, wake } = useIdle(idleSeconds * nbMsInSecond, !isLoading)
  const tasks = useMemo(() => allTasks.filter(task => isTaskActive(task, true)), [allTasks])
  const remaining = countRemaining(tasks)
  // oxlint-disable-next-line unicorn/no-null
  if (!isIdle) return null
  function handleClick() {
    wake()
    void navigate('/')
    globalThis.scrollTo({ top: 0 })
  }
  return (
    <button aria-label="Back to your tasks" className="fixed inset-0 z-40 cursor-pointer overflow-hidden bg-linear-to-tr from-stone-950 to-stone-900 text-white" data-testid="screensaver" onClick={handleClick} type="button">
      {remaining === 0 ? <ScreensaverClock accent={progressAccentColor(successPercent)} /> : <ScreensaverCountdown accent={progressAccentColor(computeProgressPercent(tasks))} remaining={remaining} />}
    </button>
  )
}
