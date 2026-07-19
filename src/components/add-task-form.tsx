import { PlusIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/use-app-store'
import { emptyForm, submitNewTask } from '../utils/task-form.utils'
import { TaskForm } from './task-form'

export function AddTaskForm() {
  const addTask = useAppStore(state => state.addTask)
  const navigate = useNavigate()
  return (
    <TaskForm
      initialForm={emptyForm}
      onCancel={() => void navigate('/')}
      onSubmit={fields => submitNewTask(addTask, fields, () => void navigate('/'))}
      submitIcon={<PlusIcon className="size-4" />}
      submitLabel="Add task"
      submitName="add-task"
    />
  )
}
