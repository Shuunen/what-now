import { type ReactNode, useState } from 'react'
import { useAppStore } from '../store/use-app-store'
import { type FormState, formToFields } from '../utils/task-form.utils'
import type { NewTaskFields } from '../utils/tasks.utils'
import { taskSentence, type Update } from './task-sentence'
import { Button } from './ui/button'

type TaskFormProps = {
  initialForm: FormState
  onCancel: () => void
  onSubmit: (fields: NewTaskFields) => void
  submitIcon: ReactNode
  submitLabel: string
  submitName: string
}

/**
 * Reusable task form, shown in the add-task page and the add-task modal.
 * Rendered as a fill-in-the-blanks sentence rather than a stack of labelled fields.
 * @param props - the form configuration
 * @param props.initialForm - the initial form state, empty for add, prefilled for edit
 * @param props.onCancel - called when the user cancels
 * @param props.onSubmit - called with the task fields on a valid submit
 * @param props.submitIcon - icon shown in the submit button
 * @param props.submitLabel - label shown in the submit button
 * @param props.submitName - name (and testid seed) for the submit button
 * @returns the task form element
 */
export function TaskForm({ initialForm, onCancel, onSubmit, submitIcon, submitLabel, submitName }: TaskFormProps) {
  const [form, setForm] = useState<FormState>(initialForm)
  // block submitting a brand-new task before hydration resolves, otherwise the store's
  // in-flight loadData() from IndexedDB would silently overwrite this addition
  const isLoading = useAppStore(state => state.isLoading)
  const update: Update = (key, value) => setForm(previous => ({ ...previous, [key]: value }))
  function handleSubmit(event: { preventDefault: () => void }) {
    event.preventDefault()
    if (isLoading) return
    const fields = formToFields(form)
    if (fields === undefined) return
    onSubmit(fields)
  }
  return (
    <form className="flex w-full max-w-3xl flex-col gap-4" data-testid="task-form" onSubmit={handleSubmit}>
      {taskSentence(form, update)}
      <div className="flex w-full justify-end gap-3 pt-3 text-base">
        <Button disabled={isLoading} name={submitName} type="submit">
          {submitIcon}
          {submitLabel}
        </Button>
        <Button name="cancel" onClick={onCancel} type="button" variant="ghost">
          Cancel
        </Button>
      </div>
    </form>
  )
}
