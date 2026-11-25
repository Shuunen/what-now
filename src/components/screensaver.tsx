import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { nbMsInSecond } from 'shuutils'
import { useIdle } from '../hooks/use-idle'
import { useAppStore } from '../store/use-app-store'
import { ScreensaverBody } from './screensaver-body'

/** the page with a form to fill, a tap on the screensaver must not take the user away from it */
const formPath = '/add-task'

/**
 * The fake screensaver, for a device that never really sleeps like an Echo Show, so after a while without touch this covers the app :
 * the remaining task count while some are left, a clock once all are done. A tap brings the user back to the tasks list, a key press wakes it on the current page.
 * @returns the screensaver, or nothing when the user is active
 */
export function Screensaver() {
  const idleSeconds = useAppStore(state => state.data.settings.screensaverIdleSeconds)
  const isLoading = useAppStore(state => state.isLoading)
  const allTasks = useAppStore(state => state.data.tasks)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { isIdle, wake } = useIdle(idleSeconds * nbMsInSecond, !isLoading)
  // the page stays mounted under the screensaver : without this, a key press would still reach the focused element, and a soft keyboard would stay up
  useEffect(() => {
    if (isIdle && document.activeElement instanceof HTMLElement) document.activeElement.blur()
  }, [isIdle])
  // oxlint-disable-next-line unicorn/no-null
  if (!isIdle) return null
  function handleClick() {
    wake()
    if (pathname === formPath) return
    void navigate('/')
    globalThis.scrollTo({ top: 0 })
  }
  return (
    <button aria-label="Back to your tasks" className="fixed inset-0 z-40 cursor-pointer overflow-hidden bg-linear-to-tr from-stone-950 to-stone-900 text-white" data-testid="screensaver" onClick={handleClick} type="button">
      <ScreensaverBody tasks={allTasks} />
    </button>
  )
}
