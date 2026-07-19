import { PlusIcon } from 'lucide-react'
import { daysAgoIso10 } from 'shuutils'
import { useAppStore } from '../store/use-app-store'
import { emptyForm, submitNewTask } from '../utils/task-form.utils'
import { daysRecurrence } from '../utils/tasks.utils'
import { TaskForm } from './task-form'
import { Modal } from './ui/modal'

type AddTaskModalProps = {
  onClose: () => void
}

/**
 * Modal that reuses the task form to add a brand-new task from the planner, due on the current day.
 * @param props - the modal configuration
 * @param props.onClose - called after adding or when the modal is dismissed
 * @returns the add modal element
 */
export function AddTaskModal({ onClose }: AddTaskModalProps) {
  const addTask = useAppStore(state => state.addTask)
  return (
    <Modal onClose={onClose} testId="add-task-modal" title="Add task">
      <TaskForm
        initialForm={emptyForm}
        onCancel={onClose}
        onSubmit={fields => {
          const recurrence = daysRecurrence(fields.once ?? 'day')
          submitNewTask(addTask, { ...fields, completedOn: recurrence > 0 ? daysAgoIso10(recurrence) : '' }, onClose)
        }}
        submitIcon={<PlusIcon className="size-4" />}
        submitLabel="Add task"
        submitName="add-task"
      />
    </Modal>
  )
}
