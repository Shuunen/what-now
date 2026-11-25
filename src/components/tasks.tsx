import type { Task } from '../schemas/task'
import { useAppStore } from '../store/use-app-store'
import { computeProgressPercent, progressAccentColor } from '../utils/progress.utils'
import { isTaskActive } from '../utils/tasks.utils'
import { CheckmarkIcon } from './icons/checkmark-icon'
import { Button } from './ui/button'

/**
 * The list of tasks, each one a button that toggles it.
 * @param props - the component props
 * @param props.isWide - lays the tasks out in two bigger columns, for a landscape screen
 * @param props.tasks - the tasks to show
 * @returns the tasks list element
 */
export function Tasks({ isWide = false, tasks }: { isWide?: boolean; tasks: Task[] }) {
  const toggleTask = useAppStore(state => state.toggleTask)
  const accentColor = progressAccentColor(computeProgressPercent(tasks))

  return (
    <div className={isWide ? 'grid grid-cols-2 gap-x-10 gap-y-1' : 'grid grid-cols-1 gap-2'} data-testid="tasks">
      {tasks.map(task => {
        const isActive = isTaskActive(task)
        return (
          <Button
            className={`-ml-2 w-full min-w-0 items-center gap-4 pb-3 pl-2 text-start whitespace-nowrap transition-transform duration-300 ease-out ${isActive ? '' : 'opacity-60'}`}
            key={task.id}
            name={task.name}
            onClick={() => toggleTask(task.id)}
            type="button"
            variant="ghost"
          >
            <span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${isActive ? 'border-2 border-white/30' : ''}`} style={isActive ? undefined : { background: accentColor }}>
              {!isActive && <CheckmarkIcon className="text-black" />}
            </span>
            <span className={`max-w-full min-w-0 overflow-hidden ${isWide ? 'text-xl' : 'text-lg'} leading-none font-medium text-ellipsis ${isActive ? '' : 'relative inline-block text-white/50'}`}>
              {task.name}
              {!isActive && <span aria-hidden="true" className="absolute top-1/2 left-0 h-[2.4px] w-full -translate-y-1/2 animate-[wn-strike_0.4s_ease-out_forwards] rounded-sm" style={{ background: accentColor }} />}
            </span>
          </Button>
        )
      })}
    </div>
  )
}
