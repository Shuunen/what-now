import { useState } from 'react'

const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/u

type TimeFieldProps = {
  disabled: boolean
  id: string
  label: string
  onSave: (time: string) => void
  saved: string
}

/**
 * A labelled time field. The user can clear and retype it, only a complete valid time (HH:mm) is saved,
 * and on blur the field goes back to the saved time. It reads its initial value from `saved`, so remount it (with a key) when the stored data loads.
 * @param props - the component props
 * @param props.disabled - disables the input, e.g. while the store is still hydrating
 * @param props.id - the input id, also its name and the base of its testid
 * @param props.label - the visible label
 * @param props.onSave - called with each complete valid time
 * @param props.saved - the saved time, HH:mm
 * @returns the labelled time input
 */
export function TimeField({ disabled, id, label, onSave, saved }: TimeFieldProps) {
  const [draft, setDraft] = useState(saved)
  function handleChange(value: string) {
    setDraft(value)
    if (timeRegex.test(value)) onSave(value)
  }
  return (
    <label className="flex items-center gap-2" htmlFor={id}>
      {label}
      <input
        className="rounded-md border border-white/20 px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        data-testid={id}
        disabled={disabled}
        id={id}
        name={id}
        onBlur={() => setDraft(saved)}
        onChange={event => handleChange(event.target.value)}
        type="time"
        value={draft}
      />
    </label>
  )
}
