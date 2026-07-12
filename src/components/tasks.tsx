import type { Task } from '../types'
import { logger } from '../utils/logger.utils'
import { computeProgressPercent, progressAccentColor } from '../utils/progress.utils'
import { state } from '../utils/state.utils'
import { isTaskActive, toggleComplete } from '../utils/tasks.utils'
import { CheckmarkIcon } from './icons/checkmark-icon'
import { Button } from './ui/button'

function onTaskClick(task: Task) {
  void toggleComplete(task)
  logger.info('task will be updated in state', task)
  state.tasks = state.tasks.map(item => (item.id === task.id ? task : item))
}

export function Tasks({ tasks }: { tasks: Task[] }) {
  const accentColor = progressAccentColor(computeProgressPercent(tasks))

  return (
    <div className="grid gap-2" data-testid="tasks">
      {tasks.map(task => {
        const isActive = isTaskActive(task)
        return (
          <Button
            className={`-ml-2 items-center gap-4 pb-3 pl-2 text-start whitespace-nowrap transition-transform duration-300 ease-out ${isActive ? '' : 'opacity-60'}`}
            key={task.id}
            name={task.name}
            onClick={() => onTaskClick(task)}
            type="button"
            variant="ghost"
          >
            <span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${isActive ? 'border-2 border-white/30' : ''}`} style={isActive ? undefined : { background: accentColor }}>
              {!isActive && <CheckmarkIcon className="text-black" />}
            </span>
            <span className={`max-w-60 overflow-hidden text-lg leading-none font-medium text-ellipsis ${isActive ? '' : 'relative inline-block text-white/50'}`}>
              {task.name}
              {!isActive && <span aria-hidden="true" className="absolute top-1/2 left-0 h-[2.4px] w-full -translate-y-1/2 animate-[wn-strike_0.4s_ease-out_forwards] rounded-sm" style={{ background: accentColor }} />}
            </span>
          </Button>
        )
      })}
    </div>
  )
}
