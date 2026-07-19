import type { FormState } from '../utils/task-form.utils'

// units mirror the recurrenceRegex in tasks.utils (day|week|month|year)
const units = [
  { label: 'days', value: 'day' },
  { label: 'weeks', value: 'week' },
  { label: 'months', value: 'month' },
  { label: 'years', value: 'year' },
] as const

// blanks in the sentence: a transparent field with an underline, sized to hint at how much to type
// blanks grow and shrink with their content (field-sizing) rather than filling the line
const blankClass = 'min-w-[42px] max-w-full border-b-2 border-white/30 pb-0 text-center leading-none transition-colors [field-sizing:content] placeholder:text-white/40 focus:border-primary focus:outline-none'
const growBlankClass = `${blankClass} text-left`
const numberBlankClass = blankClass
const radioClass =
  'cursor-pointer border-b-2 border-transparent leading-none text-white/40 line-through transition-colors hover:text-white/70 has-[:checked]:border-white/30 has-[:checked]:text-white has-[:checked]:no-underline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary'

export type Update = (key: keyof FormState, value: string) => void

function word(text: string) {
  return <span className="text-white/70">{text}</span>
}

function nameBlank(form: FormState, update: Update) {
  return (
    <input
      autoFocus
      aria-label="Name of the task"
      className={growBlankClass}
      data-testid="input-task-name"
      id="input-task-name"
      maxLength={150}
      name="task-name"
      onChange={event => update('name', event.target.value)}
      placeholder="get some milk"
      required
      type="text"
      value={form.name}
    />
  )
}

function quantityBlank(form: FormState, update: Update) {
  return (
    <input
      aria-label="Frequency quantity"
      className={numberBlankClass}
      data-testid="input-task-quantity"
      max={42}
      min={1}
      name="task-quantity"
      onChange={event => update('quantity', event.target.value)}
      type="number"
      value={form.quantity}
    />
  )
}

function unitRadio(unit: (typeof units)[number], form: FormState, update: Update) {
  return (
    <label className={radioClass} data-testid={`radio-unit-${unit.value}`} key={unit.value}>
      <input checked={form.unit === unit.value} className="sr-only" name="task-unit" onChange={() => update('unit', unit.value)} type="radio" value={unit.value} />
      {Number(form.quantity) === 1 ? unit.value : unit.label}
    </label>
  )
}

function reasonBlank(form: FormState, update: Update) {
  return (
    <input
      aria-label="Reason (optional)"
      className={growBlankClass}
      data-testid="input-task-reason"
      maxLength={150}
      name="task-reason"
      onChange={event => update('reason', event.target.value)}
      placeholder="it's good for my bones"
      type="text"
      value={form.reason}
    />
  )
}

function minutesBlank(form: FormState, update: Update) {
  return (
    <input
      aria-label="Duration in minutes (optional)"
      className={numberBlankClass}
      data-testid="input-task-minutes"
      min={0}
      name="task-minutes"
      onChange={event => update('minutes', event.target.value)}
      placeholder="20"
      type="number"
      value={form.minutes}
    />
  )
}

/**
 * The fill-in-the-blanks sentence, shared between the modal task form and the planner quote form.
 * @param form - the current form state
 * @param update - setter for a single form field
 * @returns the sentence as a flowing, wrapping row of words and blanks
 */
export function taskSentence(form: FormState, update: Update) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 text-lg leading-loose">
      {word('I want to')}
      {nameBlank(form, update)}
      {word('every')}
      {quantityBlank(form, update)}
      {units.map(unit => unitRadio(unit, form, update))}
      {word('because')}
      {reasonBlank(form, update)}
      {word(', it just takes')}
      {minutesBlank(form, update)}
      {word('minutes.')}
    </div>
  )
}
