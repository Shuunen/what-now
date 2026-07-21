// oxlint-disable react/no-multi-comp
// oxlint-disable max-lines
import { invariant, kebabCase } from 'es-toolkit'
import { CalendarIcon, MinusIcon, MoveLeftIcon, MoveRightIcon, PlusIcon, RotateCcwIcon, SaveIcon } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { dateIso10, formatDate } from 'shuutils'
import { AddTaskModal } from '../components/add-task-modal'
import { FloatingMenu } from '../components/floating-menu'
import { TaskQuoteForm } from '../components/task-quote-form'
import type { Update } from '../components/task-sentence'
import { Button } from '../components/ui/button'
import type { Task } from '../schemas/task'
import { useAppStore } from '../store/use-app-store'
import { toastAction, toastSuccess } from '../store/use-toast-store'
import { logger } from '../utils/logger.utils'
import { useActions } from '../utils/pages.utils'
import {
  allDayIndices,
  anchoredCompletedOn,
  canMoveTaskEarlier,
  computeTaskModifications,
  createTaskDistribution,
  dayNames,
  daysToFrequencyString,
  frequencyLabel,
  getHigherFrequency,
  getLowerFrequency,
  getQuoteModifiedTaskIds,
  getTaskColor,
  type TaskFieldModifications,
  type TaskModifications,
} from '../utils/planner.utils'
import { emptyForm, type FormState, taskToForm } from '../utils/task-form.utils'
import { buildOnce, daysRecurrence, daysSinceCompletion, isNeverCompleted } from '../utils/tasks.utils'

/**
 * Control buttons component for task card hover actions
 * @param properties - Component properties
 * @param properties.canIncrease - Whether frequency can be increased
 * @param properties.canDecrease - Whether frequency can be decreased
 * @param properties.canMoveBefore - Whether task date can be moved to an earlier day
 * @param properties.canMoveAfter - Whether task date can be moved to a later day
 * @param properties.onIncrease - Handler for frequency increase
 * @param properties.onDecrease - Handler for frequency decrease
 * @param properties.onBefore - Handler for moving date before
 * @param properties.onAfter - Handler for moving date after
 * @returns JSX element for control buttons
 */
function TaskCardControls({
  canIncrease,
  canDecrease,
  canMoveBefore,
  canMoveAfter,
  onIncrease,
  onDecrease,
  onBefore,
  onAfter,
}: {
  canIncrease: boolean
  canDecrease: boolean
  canMoveBefore: boolean
  canMoveAfter: boolean
  onIncrease: () => void
  onDecrease: () => void
  onBefore: () => void
  onAfter: () => void
}) {
  const btnClasses = 'size-4 py-2 justify-center'
  const iconClasses = 'size-3'
  return (
    <div className="absolute top-0.5 right-0.5 grid grid-cols-2 gap-1.5 opacity-10 sepia hover:opacity-100 hover:sepia-0" onClick={event => event.stopPropagation()}>
      <Button className={btnClasses} disabled={!canIncrease} name="increase" onClick={onIncrease} variant={canIncrease ? 'error' : 'ghost'}>
        <PlusIcon className={iconClasses} />
      </Button>
      <Button className={btnClasses} disabled={!canDecrease} name="decrease" onClick={onDecrease} variant={canDecrease ? 'success' : 'ghost'}>
        <MinusIcon className={iconClasses} />
      </Button>
      <Button className={btnClasses} disabled={!canMoveBefore} name="before" onClick={onBefore} variant={canMoveBefore ? 'default' : 'ghost'}>
        <MoveLeftIcon className={iconClasses} />
      </Button>
      <Button className={btnClasses} disabled={!canMoveAfter} name="after" onClick={onAfter} variant={canMoveAfter ? 'default' : 'ghost'}>
        <MoveRightIcon className={iconClasses} />
      </Button>
    </div>
  )
}

type TaskCardHandlersOptions = {
  task: Task
  currentRecurrence: number
  onFrequencyChange: (taskId: string, newOnce: string) => void
  onDateChange: (taskId: string, direction: 'before' | 'after') => void
}

/**
 * Hook bundling the frequency/date change callbacks for a single task card
 * @param options - The task, its current recurrence, and the change handlers
 * @param options.task - The task the card represents
 * @param options.currentRecurrence - The task's effective recurrence in days
 * @param options.onFrequencyChange - Handler for frequency changes
 * @param options.onDateChange - Handler for date changes
 * @returns The four click handlers used by TaskCardControls
 */
function useTaskCardHandlers({ task, currentRecurrence, onFrequencyChange, onDateChange }: TaskCardHandlersOptions) {
  const handleIncrease = useCallback(() => {
    const higherFrequency = getHigherFrequency(currentRecurrence)
    if (higherFrequency !== undefined) onFrequencyChange(task.id, daysToFrequencyString(higherFrequency))
  }, [currentRecurrence, onFrequencyChange, task.id])

  const handleDecrease = useCallback(() => {
    const lowerFrequency = getLowerFrequency(currentRecurrence)
    if (lowerFrequency !== undefined) onFrequencyChange(task.id, daysToFrequencyString(lowerFrequency))
  }, [currentRecurrence, onFrequencyChange, task.id])

  const handleBefore = useCallback(() => {
    onDateChange(task.id, 'before')
  }, [onDateChange, task.id])

  const handleAfter = useCallback(() => {
    onDateChange(task.id, 'after')
  }, [onDateChange, task.id])

  return { handleAfter, handleBefore, handleDecrease, handleIncrease }
}

/**
 * Component to render a single task card with hover controls for frequency editing
 * @param properties - Component properties containing the task and handlers
 * @param properties.task - The task to display
 * @param properties.modifications - Current modifications to tasks
 * @param properties.onFrequencyChange - Handler for frequency changes
 * @param properties.onDateChange - Handler for date changes
 * @param properties.isSelected - Whether this task is currently selected
 * @param properties.onSelect - Handler for selecting the task
 * @returns JSX element for the task card
 */
function TaskCard({
  task,
  modifications,
  onFrequencyChange,
  onDateChange,
  isSelected,
  onSelect,
}: {
  task: Task
  modifications: Record<string, string>
  onFrequencyChange: (taskId: string, newOnce: string) => void
  onDateChange: (taskId: string, direction: 'before' | 'after') => void
  isSelected: boolean
  onSelect: (taskId: string) => void
}) {
  const colorClass = getTaskColor(task, modifications)
  const currentOnce = modifications[task.id] ?? task.once
  const currentRecurrence = daysRecurrence(currentOnce)
  const recurrenceLabel = frequencyLabel(currentOnce)
  const isModified = modifications[task.id] !== undefined
  const { handleAfter, handleBefore, handleDecrease, handleIncrease } = useTaskCardHandlers({ currentRecurrence, onDateChange, onFrequencyChange, task })

  const canIncrease = getHigherFrequency(currentRecurrence) !== undefined
  const canDecrease = getLowerFrequency(currentRecurrence) !== undefined
  const canMoveBefore = canMoveTaskEarlier(task, modifications)
  const canMoveAfter = task.once !== 'day'
  const completionLabel = isNeverCompleted(task) ? 'never completed' : `completed ${daysSinceCompletion(task)} days ago`
  const title = `${task.name} (${task.minutes} min, ${completionLabel})`
  let ringClass = ''
  if (isSelected) ringClass = 'ring-2 ring-primary'
  else if (isModified) ringClass = 'ring-2 ring-yellow-400/50'

  return (
    <div
      className={`rounded border-2 px-2 py-1 text-xs ${colorClass} ${ringClass} group relative w-full cursor-pointer truncate text-left`}
      data-completed-on={task.completedOn}
      data-once={task.once}
      data-selected={isSelected}
      data-testid={`task-card-${kebabCase(task.name)}`}
      onClick={() => onSelect(task.id)}
      title={title}
    >
      <div className="max-w-xs font-medium whitespace-break-spaces">{task.name}</div>
      <div className="text-xs opacity-75">{recurrenceLabel}</div>
      <TaskCardControls canDecrease={canDecrease} canIncrease={canIncrease} canMoveAfter={canMoveAfter} canMoveBefore={canMoveBefore} onAfter={handleAfter} onBefore={handleBefore} onDecrease={handleDecrease} onIncrease={handleIncrease} />
    </div>
  )
}

/**
 * Component to render a single day column
 * @param properties - Component properties
 * @param properties.dayName - Name of the day
 * @param properties.tasks - Tasks to display in this day
 * @param properties.modifications - Current modifications to tasks
 * @param properties.onFrequencyChange - Handler for frequency changes
 * @param properties.onDateChange - Handler for date changes
 * @param properties.realDate - Real date string for the day
 * @param properties.isToday - Whether this day is today
 * @param properties.selectedTaskId - The id of the currently selected task
 * @param properties.onSelect - Handler for selecting a task
 * @returns JSX element for the day column
 */
function DayColumn({
  dayName,
  tasks,
  modifications,
  onFrequencyChange,
  onDateChange,
  realDate,
  isToday,
  selectedTaskId,
  onSelect,
}: {
  dayName: string
  tasks: Task[]
  modifications: Record<string, string>
  onFrequencyChange: (taskId: string, newOnce: string) => void
  onDateChange: (taskId: string, direction: 'before' | 'after') => void
  realDate: string
  isToday?: boolean
  selectedTaskId?: string
  onSelect: (taskId: string) => void
}) {
  return (
    <div className={`flex h-full min-h-96 w-full grow flex-col border-r border-gray-600/30 last:border-r-0 ${isToday ? 'bg-primary/10' : ''}`} data-testid={isToday ? 'planner-today' : undefined}>
      <div className={`flex flex-col border-b border-gray-600/30 bg-gray-800/40 p-3 text-center leading-6 font-medium text-gray-200 ${isToday ? 'bg-primary/10' : ''}`}>
        {dayName}
        <span className="ml-2 opacity-75">{realDate}</span>
      </div>
      <div className="flex grow flex-col gap-2 p-3">
        {tasks.map(task => (
          <TaskCard isSelected={task.id === selectedTaskId} key={`${task.id}-${realDate}`} modifications={modifications} onDateChange={onDateChange} onFrequencyChange={onFrequencyChange} onSelect={onSelect} task={task} />
        ))}
      </div>
    </div>
  )
}

/**
 * Renders the main planner grid and legend
 * @param properties - Component properties
 * @param properties.tasksByDay - Distribution of tasks by day index
 * @param properties.modifications - Current modifications to tasks
 * @param properties.onFrequencyChange - Handler for frequency changes
 * @param properties.onDateChange - Handler for date changes
 * @param properties.selectedTaskId - The id of the currently selected task
 * @param properties.onSelect - Handler for selecting a task
 * @returns JSX element for the planner content
 */
function PlannerContent({
  tasksByDay,
  modifications,
  onFrequencyChange,
  onDateChange,
  selectedTaskId,
  onSelect,
}: {
  tasksByDay: Record<number, Task[]>
  modifications: Record<string, string>
  onFrequencyChange: (taskId: string, newOnce: string) => void
  onDateChange: (taskId: string, direction: 'before' | 'after') => void
  selectedTaskId?: string
  onSelect: (taskId: string) => void
}) {
  const today = new Date()
  return (
    <div className="overflow-hidden rounded-lg border border-gray-600/30 bg-gray-800/30 shadow-sm">
      <div className="flex min-h-96 overflow-x-auto">
        {allDayIndices.map(index => {
          const columnDate = new Date(today)
          columnDate.setDate(today.getDate() + index)
          const dayName = dayNames[columnDate.getDay()]
          const realDate = formatDate(columnDate, 'dd MMMM')
          const isToday = index === 0
          const tasks = tasksByDay[index]
          invariant(tasks, `Tasks for day index ${index} not found`)
          return (
            <div className="min-w-48 shrink-0" key={realDate}>
              <DayColumn
                dayName={dayName}
                isToday={isToday}
                modifications={modifications}
                onDateChange={onDateChange}
                onFrequencyChange={onFrequencyChange}
                onSelect={onSelect}
                realDate={realDate}
                selectedTaskId={selectedTaskId}
                tasks={tasks}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Calculate planner metrics based on tasks and modifications
 * @param tasks - Array of tasks
 * @param modifications - Task modifications record
 * @returns Calculated metrics object
 */
function calculatePlannerMetrics(tasks: Task[], modifications: Record<string, string>) {
  const activeTasksCount = tasks.length
  const daysPerWeek = 7
  const decimalPrecision = 10

  // Calculate average time per day considering task frequency and modifications
  let totalWeeklyMinutes = 0
  let totalWeeklyTasks = 0
  for (const task of tasks) {
    const currentRecurrence = daysRecurrence(modifications[task.id] ?? task.once)
    const weeklyOccurrences = currentRecurrence > 0 ? daysPerWeek / currentRecurrence : 0
    totalWeeklyMinutes += task.minutes * weeklyOccurrences
    totalWeeklyTasks += weeklyOccurrences
  }

  const averageTimePerDay = Math.round(totalWeeklyMinutes / daysPerWeek)
  const averageTasksPerDay = Math.round((totalWeeklyTasks / daysPerWeek) * decimalPrecision) / decimalPrecision

  // Calculate average frequency (in days) using current modifications
  let totalFrequency = 0
  for (const task of tasks) totalFrequency += daysRecurrence(modifications[task.id] ?? task.once)

  const averageFrequency = activeTasksCount > 0 ? Math.round((totalFrequency / activeTasksCount) * decimalPrecision) / decimalPrecision : 0

  return { activeTasksCount, averageFrequency, averageTasksPerDay, averageTimePerDay }
}

/**
 * Component to display planner metrics
 * @param properties - Component properties
 * @param properties.tasks - Array of tasks to calculate metrics from
 * @param properties.modifications - Current modifications to tasks
 * @returns JSX element for the metrics display
 */
function PlannerMetrics({ tasks, modifications }: { tasks: Task[]; modifications: Record<string, string> }) {
  const metrics = useMemo(() => calculatePlannerMetrics(tasks, modifications), [tasks, modifications])

  return (
    <div className="mt-4 rounded-lg border border-gray-600/30 bg-gray-800/30 p-4 shadow-sm">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">{metrics.activeTasksCount}</div>
          <div className="text-sm text-gray-400">Active Tasks</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">{metrics.averageTimePerDay}</div>
          <div className="text-sm text-gray-400">Avg Minutes/Day</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-400">{metrics.averageTasksPerDay}</div>
          <div className="text-sm text-gray-400">Avg Tasks/Day</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-400">{metrics.averageFrequency}</div>
          <div className="text-sm text-gray-400">Avg Frequency (days)</div>
        </div>
      </div>
    </div>
  )
}

/**
 * Apply modifications to tasks for display purposes
 * @param tasks - Original tasks
 * @param modifications - Current modifications
 * @returns Tasks with modifications applied
 */
function applyModificationsToTasks(tasks: Task[], modifications: TaskModifications): Task[] {
  return tasks.map(task => {
    const modifiedCompletedOn = modifications.completedOn[task.id]
    const modifiedFields = modifications.fields[task.id]
    if (modifiedCompletedOn === undefined && modifiedFields === undefined) return task
    return { ...task, ...(modifiedCompletedOn === undefined ? {} : { completedOn: modifiedCompletedOn }), ...modifiedFields }
  })
}

/**
 * Hook for handling frequency modifications
 * @param tasks - Current tasks
 * @param setModifications - Setter for modifications
 * @returns Frequency change handler
 */
function useFrequencyChange(tasks: Task[], setModifications: React.Dispatch<React.SetStateAction<TaskModifications>>) {
  return useCallback(
    (taskId: string, newOnce: string) => {
      setModifications(previous => {
        const task = tasks.find(currentTask => currentTask.id === taskId)
        if (!task) return previous
        // Anchor the completion date so the first instance the control is used against stays in place.
        const currentOnce = previous.frequency?.[taskId] ?? task.once
        const currentCompletedOn = previous.completedOn?.[taskId] ?? task.completedOn
        const effectiveTask = { ...task, completedOn: currentCompletedOn, once: currentOnce }
        const anchored = anchoredCompletedOn(effectiveTask, daysRecurrence(newOnce))
        return {
          ...previous,
          completedOn: anchored === undefined ? previous.completedOn : { ...previous.completedOn, [taskId]: anchored },
          frequency: { ...previous.frequency, [taskId]: newOnce },
        }
      })
    },
    [tasks, setModifications],
  )
}

/**
 * Hook for handling date modifications
 * @param tasks - Current tasks
 * @param modifications - Current modifications
 * @param setModifications - Setter for modifications
 * @returns Date change handler
 */
function useDateChange(tasks: Task[], modifications: TaskModifications, setModifications: React.Dispatch<React.SetStateAction<TaskModifications>>) {
  return useCallback(
    (taskId: string, direction: 'before' | 'after') => {
      const task = tasks.find(currentTask => currentTask.id === taskId)
      if (!task) return
      // Use the modified date if it exists, otherwise use the original task date
      const currentDateString = modifications.completedOn[taskId] || task.completedOn
      const currentDate = new Date(currentDateString)
      const newDate = new Date(currentDate)
      if (direction === 'before') newDate.setDate(currentDate.getDate() - 1)
      else newDate.setDate(currentDate.getDate() + 1)
      logger.info(`Changing date of "${task.name}" from ${dateIso10(currentDate)} to ${dateIso10(newDate)}`)
      setModifications(previous => ({
        ...previous,
        completedOn: { ...previous.completedOn, [taskId]: newDate.toISOString() },
      }))
    },
    [tasks, modifications, setModifications],
  )
}

/**
 * Hook for handling inline field edits (name, minutes, reason) coming from the quote form
 * @param setModifications - Setter for modifications
 * @returns Field change handler
 */
function useFieldChange(setModifications: React.Dispatch<React.SetStateAction<TaskModifications>>) {
  return useCallback(
    (taskId: string, key: 'minutes' | 'name' | 'reason', value: string) => {
      const change: TaskFieldModifications = key === 'minutes' ? { minutes: Math.max(0, Number(value) || 0) } : { [key]: value }
      setModifications(previous => ({
        ...previous,
        fields: { ...previous.fields, [taskId]: { ...previous.fields?.[taskId], ...change } },
      }))
    },
    [setModifications],
  )
}

const emptyModifications: TaskModifications = { completedOn: {}, fields: {}, frequency: {} }

/**
 * Hook for deleting a task, offering an undo action through a toast
 * @param storeTasks - All tasks in the store, used to snapshot the task before deletion
 * @returns The delete handler
 */
function useDeleteTask(storeTasks: Task[]) {
  const updateTasks = useAppStore(state => state.updateTasks)
  const removeTask = useAppStore(state => state.removeTask)

  const handleDeleteTask = useCallback(
    (taskId: string) => {
      const task = storeTasks.find(current => current.id === taskId)
      invariant(task, `task ${taskId} not found`)
      removeTask(taskId)
      toastAction(`"${task.name}" deleted`, {
        label: 'Undo',
        onClick: () => {
          // bump syncedAt to now (rather than restoring the stale pre-delete value) so the restore
          // is treated as the latest write and wins over a newer remote tombstone during sync
          updateTasks([{ ...task, syncedAt: new Date().toISOString() }])
          toastSuccess('Task restored')
        },
      })
    },
    [removeTask, storeTasks, updateTasks],
  )

  return { handleDeleteTask }
}

/**
 * Custom hook to handle task loading and modifications
 * @returns Object containing tasks, modifications state and handlers
 */
function usePlannerTasks() {
  const storeTasks = useAppStore(state => state.data.tasks)
  const updateTasks = useAppStore(state => state.updateTasks)
  const [modifications, setModifications] = useState<TaskModifications>(emptyModifications)
  const tasks = useMemo(() => storeTasks.filter(task => !task.isDone && task.deletedOn === ''), [storeTasks]) // Filter out completed and deleted tasks
  const hasModifications = Object.keys(modifications.frequency).length > 0 || Object.keys(modifications.completedOn).length > 0 || Object.keys(modifications.fields).length > 0

  const handleFrequencyChange = useFrequencyChange(tasks, setModifications)
  const handleDateChange = useDateChange(tasks, modifications, setModifications)
  const handleFieldChange = useFieldChange(setModifications)
  const { handleDeleteTask } = useDeleteTask(storeTasks)

  const handleSaveModifications = useCallback(() => {
    if (!hasModifications) return
    logger.info('saving planner modifications...')
    const updated = computeTaskModifications(modifications, tasks)
    const stampedOn = new Date().toISOString()
    const quoteModifiedIds = getQuoteModifiedTaskIds(modifications)
    // every saved task bumps syncedAt (the sync clock) ; only genuine quote edits also bump updatedOn (the quote-attribution display field)
    updateTasks(updated.map(task => ({ ...task, syncedAt: stampedOn, ...(quoteModifiedIds.has(task.id) ? { updatedOn: stampedOn } : {}) })))
    setModifications(emptyModifications)
    toastSuccess('Modifications saved')
  }, [modifications, hasModifications, tasks, updateTasks])

  const handleDiscardModifications = useCallback(() => {
    setModifications(emptyModifications)
  }, [])

  return {
    handleDateChange,
    handleDeleteTask,
    handleDiscardModifications,
    handleFieldChange,
    handleFrequencyChange,
    handleSaveModifications,
    hasModifications,
    modifications,
    tasks,
  }
}

/**
 * Component for the planner header with title and the save/discard actions
 * @param properties - Component properties
 * @param properties.onSaveModifications - Handler for saving modifications
 * @param properties.onDiscardModifications - Handler for discarding modifications
 * @param properties.hasModifications - Whether there are unsaved modifications
 * @param properties.onAdd - Handler for opening the add task modal
 * @returns JSX element for the planner header
 */
function PlannerHeader({ onSaveModifications, onDiscardModifications, hasModifications, onAdd }: { onSaveModifications: () => void; onDiscardModifications: () => void; hasModifications: boolean; onAdd: () => void }) {
  return (
    <header className="sticky top-0 z-10 rounded-lg border-b border-gray-600/30 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 py-4 md:flex-row">
        <div className="mr-auto flex items-center gap-3">
          <CalendarIcon className="size-8" />
          <h3 className="mt-0 mb-0">Planner</h3>
        </div>
        <div className="flex gap-3">
          <Button name="add-task" onClick={onAdd} variant="outline">
            <PlusIcon className="size-4" />
            Add task
          </Button>
          {hasModifications && (
            <Button name="discard" onClick={onDiscardModifications} variant="ghost">
              <RotateCcwIcon className="size-4" />
              Discard
            </Button>
          )}
          {hasModifications && (
            <Button name="save" onClick={onSaveModifications}>
              <SaveIcon className="size-4" />
              Save modifications
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

type QuoteFormOptions = {
  formTask?: Task
  modifications: TaskModifications
  onSelect: (taskId: string) => void
  onFrequencyChange: (taskId: string, newOnce: string) => void
  onFieldChange: (taskId: string, key: 'minutes' | 'name' | 'reason', value: string) => void
}

/**
 * Derives the controlled quote-form state for the task backing the form, and the handler routing every edit
 * into the planner's shared pending modifications (frequency edits through the anchoring frequency handler,
 * the rest through the field handler). The form target is pinned on edit so a recurrence change that moves
 * the task across days keeps it in view.
 * @param options - the current form task, pending modifications and the change handlers
 * @param options.formTask - the task backing the form, or undefined when there is none
 * @param options.modifications - the current pending modifications
 * @param options.onSelect - selects (pins) a task as the form target
 * @param options.onFrequencyChange - handler for recurrence edits
 * @param options.onFieldChange - handler for name/minutes/reason edits
 * @returns the form state and the single-field update handler for the quote form
 */
function useQuoteForm({ formTask, modifications, onSelect, onFrequencyChange, onFieldChange }: QuoteFormOptions) {
  // The quote form is a live view of the task, including its pending frequency edit, so its recurrence blank
  // reflects the same value the +/- controls change, and editing it feeds the same modifications.
  const formOnce = formTask ? modifications.frequency[formTask.id] : undefined
  const formTaskWithFrequency = formTask && formOnce !== undefined ? { ...formTask, once: formOnce } : formTask
  const form: FormState = formTaskWithFrequency ? taskToForm(formTaskWithFrequency) : emptyForm
  const handleFormUpdate: Update = (key, value) => {
    invariant(formTask, 'a task must back the form before it can be edited')
    onSelect(formTask.id) // pin the form to this task so a recurrence edit that moves it keeps it in view
    if (key !== 'quantity' && key !== 'unit') {
      onFieldChange(formTask.id, key, value)
      return
    }
    const next = { ...form, [key]: value }
    onFrequencyChange(formTask.id, buildOnce(Number(next.quantity), next.unit))
  }
  return { form, handleFormUpdate }
}

/**
 * Derives the per-day task distribution and the task currently backing the quote form
 * @param tasks - the planner's active tasks
 * @param modifications - the current pending modifications
 * @param selectedTaskId - the explicitly selected task id, if any
 * @returns the tasks grouped by day, and the task backing the quote form
 */
function usePlannerLayout(tasks: Task[], modifications: TaskModifications, selectedTaskId: string | undefined) {
  const tasksWithModifications = useMemo(() => applyModificationsToTasks(tasks, modifications), [tasks, modifications])
  const tasksByDay = useMemo(() => createTaskDistribution(tasksWithModifications, modifications.frequency), [tasksWithModifications, modifications.frequency])
  // Keep the form always mounted so selecting a task swaps its content instead of pushing the layout down.
  // When nothing is selected, fall back to the first task shown on the planner (earliest day, top of the column).
  const firstPlannerTask = allDayIndices.map(index => tasksByDay[index]?.[0]).find(task => task !== undefined)
  const selectedTask = tasksWithModifications.find(task => task.id === selectedTaskId)
  const formTask = selectedTask ?? firstPlannerTask
  return { formTask, tasksByDay }
}

/**
 * The main planner page component
 * @returns JSX element for the planner page
 */
export function PagePlanner() {
  const actions = useActions()
  const { handleDateChange, handleDeleteTask, handleDiscardModifications, handleFieldChange, handleFrequencyChange, handleSaveModifications, hasModifications, modifications, tasks } = usePlannerTasks()
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(undefined)
  const [isAdding, setIsAdding] = useState(false)
  const handleSelect = useCallback((taskId: string) => {
    setSelectedTaskId(previous => (previous === taskId ? undefined : taskId))
  }, [])
  const handleDelete = useCallback(
    (taskId: string) => {
      handleDeleteTask(taskId)
      setSelectedTaskId(previous => (previous === taskId ? undefined : previous))
    },
    [handleDeleteTask],
  )
  const { formTask, tasksByDay } = usePlannerLayout(tasks, modifications, selectedTaskId)
  const { form, handleFormUpdate } = useQuoteForm({ formTask, modifications, onFieldChange: handleFieldChange, onFrequencyChange: handleFrequencyChange, onSelect: setSelectedTaskId })

  if (tasks.length === 0)
    return (
      <div className="flex grow flex-col items-center justify-center gap-4 text-center" data-testid="page-planner">
        <p>
          No tasks yet. Head over to{' '}
          <Link className="border-b" to="/settings">
            settings
          </Link>{' '}
          to import your tasks.
        </p>
        <FloatingMenu actions={actions} />
      </div>
    )

  return (
    <div className="flex grow flex-col justify-center" data-testid="page-planner">
      <PlannerHeader hasModifications={hasModifications} onAdd={() => setIsAdding(true)} onDiscardModifications={handleDiscardModifications} onSaveModifications={handleSaveModifications} />
      <PlannerContent modifications={modifications.frequency} onDateChange={handleDateChange} onFrequencyChange={handleFrequencyChange} onSelect={handleSelect} selectedTaskId={selectedTaskId} tasksByDay={tasksByDay} />
      {formTask !== undefined && <TaskQuoteForm form={form} key={formTask.id} onDelete={handleDelete} onUpdate={handleFormUpdate} task={formTask} />}
      <PlannerMetrics modifications={modifications.frequency} tasks={tasks} />
      {isAdding && <AddTaskModal onClose={() => setIsAdding(false)} />}
      <FloatingMenu actions={actions} />
    </div>
  )
}
