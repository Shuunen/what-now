import { AddTaskForm } from '../components/add-task-form'
import { FloatingMenu } from '../components/floating-menu'
import { useActions } from '../utils/pages.utils'

export function PageAddTask() {
  const actions = useActions()
  return (
    <div className="flex grow flex-col items-center justify-center gap-8 py-24" data-testid="page-add-task">
      <h1>Add a task</h1>
      <AddTaskForm />
      <FloatingMenu actions={actions} />
    </div>
  )
}
