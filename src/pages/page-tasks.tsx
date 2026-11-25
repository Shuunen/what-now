import { PlusIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Finale } from '../components/finale'
import { FloatingMenu } from '../components/floating-menu'
import { Progress } from '../components/progress'
import { Status } from '../components/status'
import { Tasks } from '../components/tasks'
import { Button } from '../components/ui/button'
import { useIsLandscape } from '../hooks/use-is-landscape'
import { useAppStore } from '../store/use-app-store'
import { useActions } from '../utils/pages.utils'
import { computeProgressPercent, progressAccentColor, progressText } from '../utils/progress.utils'
import { cn } from '../utils/styles.utils'
import { byActive, isTaskActive } from '../utils/tasks.utils'

export function PageTasks() {
  const allTasks = useAppStore(state => state.data.tasks)
  const isLoading = useAppStore(state => state.isLoading)
  const actions = useActions()
  const navigate = useNavigate()
  const tasks = useMemo(() => allTasks.filter(task => isTaskActive(task, true)).toSorted(byActive), [allTasks])
  const percent = computeProgressPercent(tasks)
  const accentColor = progressAccentColor(percent)
  const info = isLoading ? 'Loading, please wait...' : ''
  const hasTasks = allTasks.length > 0
  const isLandscape = useIsLandscape()

  return (
    <div className={cn('relative flex w-full min-w-0 grow flex-col justify-center gap-4 sm:mx-auto', isLandscape ? 'max-w-5xl gap-3 py-6' : 'max-w-2xl py-24', hasTasks ? '' : 'text-center')} data-testid="page-tasks">
      <div
        className={cn(
          'pointer-events-none absolute top-1/5 -translate-x-1/2 -translate-y-1/2 animate-[pulse_6s_ease-in-out_infinite] blur-[96px]',
          // the wide landscape layout must not overflow the screen : an overflowing page makes the browser widen its layout viewport, which pushes the fixed elements (menu, screensaver) off screen
          isLandscape ? 'left-3/4 size-96' : 'left-3/5 size-110 max-w-[80vw] md:left-full md:size-135',
        )}
        style={{ background: `radial-gradient(circle at 50% 42%, ${accentColor}, transparent 50%)` }}
      />
      <div className={cn('relative z-10', isLandscape && 'flex items-end gap-8')}>
        <h1 className={cn('relative z-1 -ml-2', isLandscape && 'text-5xl leading-none')}>
          <span className="opacity-80">What</span>
          {isLandscape ? ' ' : <br />}
          <span className={isLandscape ? '' : 'ml-1'}>now</span> <span className="font-light opacity-10">?</span>
        </h1>
        {isLandscape && <Status info={info} progress={progressText(percent)} />}
      </div>
      <div className="relative z-10 flex flex-col gap-4">
        {!isLandscape && <Status info={info} progress={progressText(percent)} />}
        <Progress tasks={tasks} />
        <Tasks isWide={isLandscape} tasks={tasks} />
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
