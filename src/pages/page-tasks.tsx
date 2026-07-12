import { useState } from 'react'
import { Finale } from '../components/finale'
import { FloatingMenu } from '../components/floating-menu'
import { Progress } from '../components/progress'
import { Status } from '../components/status'
import { Tasks } from '../components/tasks'
import { useActions } from '../utils/pages.utils'
import { computeProgressPercent, progressAccentColor } from '../utils/progress.utils'
import { state, watchState } from '../utils/state.utils'
import { cn } from '../utils/styles.utils'

export function PageTasks() {
  const [tasks, setTasks] = useState(state.tasks)
  const [error, setError] = useState(state.statusError)
  const [info, setInfo] = useState(state.statusInfo)
  const [progress, setProgress] = useState(state.statusProgress)
  const actions = useActions()
  const accentColor = progressAccentColor(computeProgressPercent(tasks))
  watchState('tasks', () => setTasks(state.tasks))
  watchState('statusError', () => setError(state.statusError))
  watchState('statusInfo', () => setInfo(state.statusInfo))
  watchState('statusProgress', () => setProgress(state.statusProgress))

  return (
    <div className={cn('relative mx-auto flex grow flex-col gap-4 py-24', state.isSetup ? '' : 'text-center')} data-testid="page-tasks">
      <div
        className="pointer-events-none absolute top-1/5 left-4/5 size-135 -translate-x-1/2 -translate-y-1/2 animate-[pulse_6s_ease-in-out_infinite] blur-[96px]"
        style={{ background: `radial-gradient(circle at 50% 42%, ${accentColor}, transparent 50%)` }}
      />
      <h1 className="relative z-10 -ml-2 text-6xl leading-16 font-extrabold tracking-tight">
        <span className="opacity-80">What</span>
        <br />
        <span className="ml-1">now</span> <span className="font-light opacity-10">?</span>
      </h1>
      <div className="relative z-10 flex flex-col gap-4">
        <Status error={error} info={info} progress={progress} />
        <Progress tasks={tasks} />
        <Tasks tasks={tasks} />
        <Progress tasks={tasks} />
      </div>
      <FloatingMenu actions={actions} isSettingsRequired={!state.isSetup} />
      <Finale tasks={tasks} />
    </div>
  )
}
