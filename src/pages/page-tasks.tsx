import { PlusIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Finale } from '../components/finale'
import { FloatingMenu } from '../components/floating-menu'
import { Progress } from '../components/progress'
import { Status } from '../components/status'
import { Tasks } from '../components/tasks'
import { Button } from '../components/ui/button'
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

  return (
    <div className={cn('relative flex grow flex-col justify-center gap-4 py-24 sm:mx-auto', hasTasks ? '' : 'text-center')} data-testid="page-tasks">
      <div
        className="pointer-events-none absolute top-1/5 left-3/5 size-110 max-w-[80vw] -translate-x-1/2 -translate-y-1/2 animate-[pulse_6s_ease-in-out_infinite] blur-[96px] md:left-full md:size-135"
        style={{ background: `radial-gradient(circle at 50% 42%, ${accentColor}, transparent 50%)` }}
      />
      <h1 className="relative z-1 -ml-2">
        <span className="opacity-80">What</span>
        <br />
        <span className="ml-1">now</span> <span className="font-light opacity-10">?</span>
      </h1>
      <div className="relative z-10 flex flex-col gap-4">
        <Status info={info} progress={progressText(percent)} />
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
