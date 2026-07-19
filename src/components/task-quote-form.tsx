import { readableTimeAgo } from 'shuutils'
import type { Task } from '../schemas/task'
import { useAppStore } from '../store/use-app-store'
import type { FormState } from '../utils/task-form.utils'
import { taskSentence, type Update } from './task-sentence'

type TaskQuoteFormProps = {
  form: FormState
  onUpdate: Update
  task: Task
}

/**
 * The selected task rendered as an editable quote, sitting inline between the planner grid and its metrics.
 * The sentence is the user's own words, so it is framed like a quotation attributed to their configured name.
 * It is fully controlled: every edit flows into the planner's pending modifications, so the grid stays in
 * sync and the shared "Save modifications" / "Discard" actions decide whether the edits are persisted.
 * @param props - the component props
 * @param props.form - the current form state, derived from the task plus pending modifications
 * @param props.onUpdate - called with a single field change, feeding the planner's pending modifications
 * @param props.task - the underlying task, used for the attribution timestamp
 * @returns the inline quote form element
 */
export function TaskQuoteForm({ form, onUpdate, task }: TaskQuoteFormProps) {
  const userName = useAppStore(state => state.data.settings.userName)
  const stamp = task.updatedOn || task.createdOn
  const author = stamp ? `${userName}, ${readableTimeAgo(new Date(stamp))}` : userName
  return (
    <div className="relative mt-4 animate-in overflow-hidden rounded-lg border border-gray-600/30 bg-gray-800/30 p-8 shadow-sm duration-500 fade-in slide-in-from-bottom-2" data-testid="task-quote-form">
      <span aria-hidden className="pointer-events-none absolute -top-2 left-1 font-serif text-9xl leading-none text-primary/50 select-none">
        “
      </span>
      <blockquote className="relative z-10 px-4">{taskSentence(form, onUpdate)}</blockquote>
      <div className="absolute right-16 bottom-1 z-10 mt-5 flex items-center justify-end gap-4">
        <figcaption className="font-serif text-lg text-gray-400 italic" data-testid="quote-author">
          — {author}
        </figcaption>
      </div>
      <span aria-hidden className="pointer-events-none absolute right-1 -bottom-20 font-serif text-9xl leading-none text-primary/50 select-none">
        ”
      </span>
    </div>
  )
}
