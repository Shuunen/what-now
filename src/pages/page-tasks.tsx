import { PlusIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Finale } from '../components/finale'
import { FloatingMenu } from '../components/floating-menu'
import { Progress } from '../components/progress'
import { Status } from '../components/status'
import { Tasks } from '../components/tasks'
import { Button } from '../components/ui/button'
import { useAppStore } from '../store/use-app-store'
import { toastError } from '../store/use-toast-store'
import { useAppStatus } from '../utils/app-status.utils'
import { type CoachOutcome, type CoachStatus, type CoachTaskActions, runCoachSession } from '../utils/coach-session.utils'
import { isBrowserSupported } from '../utils/coach-speech.utils'
import { logger } from '../utils/logger.utils'
import { useActions } from '../utils/pages.utils'
import { computeProgressPercent, progressAccentColor, progressText } from '../utils/progress.utils'
import { cn } from '../utils/styles.utils'
import { byActive, isTaskActive } from '../utils/tasks.utils'

function logCoachOutcome(outcome: CoachOutcome) {
  logger.info('coach outcome', outcome)
}

function noop() {
  /* the tasks page doesn't display the coach's transcript/response/download progress, only its status */
}

const coachTaskActions: CoachTaskActions = {
  getTasks: () => useAppStore.getState().data.tasks,
  markDone: id => useAppStore.getState().toggleTask(id),
  writeReason: (id, reason) => {
    const task = useAppStore.getState().data.tasks.find(candidate => candidate.id === id)
    if (!task) return
    const now = new Date().toISOString()
    useAppStore.getState().updateTasks([{ ...task, reason, syncedAt: now, updatedOn: now }])
  },
}

// short, lowercase, appended to the existing progress line as ", <word>" -- e.g. "Nothing done... yet, listening"
const coachStatusWords: Partial<Record<CoachStatus, string>> = {
  checking: 'checking',
  downloading: 'downloading',
  listening: 'listening',
  speaking: 'speaking',
  thinking: 'thinking',
}

/**
 * Drives the voice coach straight from the tasks page: attempts to start a
 * session the moment there are active tasks to talk about, with no button.
 * Chrome requires a fresh user gesture for the on-device model's download
 * and can block mic access without one, so a silent first attempt that fails
 * doesn't show an error -- it just waits for the user's next click anywhere
 * on the page (completing a task, opening the menu, ...) to retry once, for
 * real this time under a genuine gesture.
 * @param hasActiveTasks - whether there's at least one task the coach could talk about
 * @returns the coach's live status
 */
function useHomeCoach(hasActiveTasks: boolean) {
  const [status, setStatus] = useState<CoachStatus>('idle')
  const startedRef = useRef(false)
  const needsRetryRef = useRef(false)

  const start = useCallback(async (isRetry: boolean) => {
    try {
      await runCoachSession({ onDownloadProgress: noop, onOutcome: logCoachOutcome, onResponse: noop, onStatusChange: setStatus, onTaskChange: noop, onTranscript: noop }, useAppStore.getState().data.settings.coachLanguage, coachTaskActions)
      setStatus('done')
    } catch (error) {
      if (!isRetry) {
        // likely blocked by Chrome's gesture requirement for the model download / mic access --
        // wait for the user's next click anywhere on the page instead of surfacing a scary error
        needsRetryRef.current = true
        return
      }
      setStatus('error')
      toastError(error instanceof Error ? error.message : 'Unknown error running the coach')
    }
  }, [])

  useEffect(() => {
    if (!hasActiveTasks || startedRef.current || !isBrowserSupported()) return
    startedRef.current = true
    void start(false)
  }, [hasActiveTasks, start])

  useEffect(() => {
    function handleClick() {
      if (!needsRetryRef.current) return
      needsRetryRef.current = false
      void start(true)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [start])

  return status
}

/**
 * @param isLoading - whether the app data is still hydrating
 * @param percent - the task completion percentage
 * @param coachStatusWord - the coach's status word to append, if any
 * @returns the text for the shared status's progress line
 */
function homeProgressText(isLoading: boolean, percent: number, coachStatusWord: string | undefined) {
  if (isLoading) return 'Loading, please wait...'
  if (coachStatusWord) return `${progressText(percent)}, ${coachStatusWord}`
  return progressText(percent)
}

/**
 * @param isCoachBusy - whether the coach is checking/downloading/thinking
 * @param isCoachSpeaking - whether the coach is currently speaking
 * @returns the tailwind classes for the ambient background blob
 */
function homeCoachBlobClassName(isCoachBusy: boolean, isCoachSpeaking: boolean) {
  return cn(
    'pointer-events-none absolute top-1/5 left-3/5 max-w-[80vw] -translate-x-1/2 -translate-y-1/2 blur-[96px] transition-[width,height] duration-500 ease-out md:left-full',
    isCoachBusy ? 'size-60 animate-[wn-heartbeat_1.1s_ease-in-out_infinite] md:size-72' : 'size-110 md:size-135',
    isCoachSpeaking && 'animate-[wn-speak-drift_2.4s_ease-in-out_infinite]',
    !isCoachBusy && !isCoachSpeaking && 'animate-[pulse_6s_ease-in-out_infinite]',
  )
}

export function PageTasks() {
  const allTasks = useAppStore(state => state.data.tasks)
  const isLoading = useAppStore(state => state.isLoading)
  const actions = useActions()
  const navigate = useNavigate()
  const tasks = useMemo(() => allTasks.filter(task => isTaskActive(task, true)).toSorted(byActive), [allTasks])
  const percent = computeProgressPercent(tasks)
  const accentColor = progressAccentColor(percent)
  const hasTasks = allTasks.length > 0
  const coachEnabled = useAppStore(state => state.data.settings.coachEnabled)
  const coachStatus = useHomeCoach(coachEnabled && !isLoading && tasks.length > 0)
  const isCoachBusy = coachStatus === 'checking' || coachStatus === 'downloading' || coachStatus === 'thinking'
  const isCoachSpeaking = coachStatus === 'speaking'
  const coachStatusWord = coachStatusWords[coachStatus]
  const progress = homeProgressText(isLoading, percent, coachStatusWord)
  useAppStatus(progress)

  return (
    <div className={cn('relative flex grow flex-col justify-center gap-4 py-24 sm:mx-auto', hasTasks ? '' : 'text-center')} data-testid="page-tasks">
      <div className={homeCoachBlobClassName(isCoachBusy, isCoachSpeaking)} data-testid="home-coach-blob" style={{ background: `radial-gradient(circle at 50% 42%, ${accentColor}, transparent 50%)` }} />
      <h1 className="relative z-1 -ml-2">
        <span className="opacity-80">What</span>
        <br />
        <span className="ml-1">now</span> <span className="font-light opacity-10">?</span>
      </h1>
      <div className="relative z-10 flex flex-col gap-4">
        <Status />
        <Progress tasks={tasks} />
        <Tasks tasks={tasks} />
        <Progress tasks={tasks} />
        {!hasTasks && !isLoading && (
          <Button className="mx-auto mt-2" name="add-first-task" onClick={() => void navigate('/add-task')} type="button">
            <PlusIcon className="size-4" />
            Add a task
          </Button>
        )}
      </div>
      <FloatingMenu actions={actions} isSettingsRequired={!hasTasks} />
      <Finale tasks={tasks} />
    </div>
  )
}
