import { toastSuccess } from 'shuutils'
import type { Task } from '../schemas/task'
import { buildOnce, type NewTaskFields, parseOnce } from './tasks.utils'

export type FormState = { minutes: string; name: string; quantity: string; reason: string; unit: string }

export const emptyForm: FormState = { minutes: '', name: '', quantity: '1', reason: '', unit: 'day' }

/**
 * Derive a prefilled form state from an existing task, for editing.
 * @param task - the task to edit
 * @returns the form state matching the task fields
 */
export function taskToForm(task: Task): FormState {
  const { quantity, unit } = parseOnce(task.once)
  return { minutes: task.minutes === 0 ? '' : String(task.minutes), name: task.name, quantity: String(quantity), reason: task.reason ?? '', unit }
}

/**
 * Convert the form state into the task fields, or undefined when the name is empty.
 * @param form - the current form state
 * @returns the task fields to save, or undefined to abort
 */
export function formToFields(form: FormState): NewTaskFields | undefined {
  const name = form.name.trim()
  if (name === '') return undefined
  const reason = form.reason.trim()
  return { minutes: Math.max(0, Number(form.minutes) || 0), name, once: buildOnce(Number(form.quantity), form.unit), reason: reason === '' ? undefined : reason }
}

/**
 * Add a new task, show the success toast, then run the caller's completion action.
 * Shared by the add-task page and the planner's add-task modal so both stay in sync.
 * @param addTask - the store's addTask action
 * @param fields - the task fields to create
 * @param onDone - called after the task is added and the toast is shown, e.g. to navigate or close a modal
 */
export function submitNewTask(addTask: (fields: NewTaskFields) => void, fields: NewTaskFields, onDone: () => void) {
  addTask(fields)
  toastSuccess('Task added')
  onDone()
}
