type TextSettingProps = {
  description: string
  disabled?: boolean
  id: string
  label: string
  maxLength: number
  onChange: (value: string) => void
  pattern?: string
  placeholder: string
  value: string
}

/**
 * A labelled text input for a single setting, wrapped in its own section.
 * @param props - the component props
 * @param props.description - the helper text shown under the label
 * @param props.disabled - disables the input, e.g. while the store is still hydrating, so an edit can't be silently overwritten by the pending load
 * @param props.id - the input id, also used to build the section testid
 * @param props.label - the visible field label
 * @param props.maxLength - the maximum number of characters allowed
 * @param props.onChange - called with the new value on every edit
 * @param props.pattern - an optional HTML validation pattern
 * @param props.placeholder - the input placeholder
 * @param props.value - the current value
 * @returns the setting section element
 */
export function TextSetting({ description, disabled = false, id, label, maxLength, onChange, pattern, placeholder, value }: TextSettingProps) {
  return (
    <section className="flex w-full max-w-md flex-col gap-3" data-testid={`setting-${id}`}>
      <label className="flex flex-col gap-1 text-sm font-medium" htmlFor={id}>
        {label}
        <span className="font-normal text-white/60">{description}</span>
      </label>
      <input
        className="w-full rounded-md border border-white/20 px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        id={id}
        maxLength={maxLength}
        name={id}
        onChange={event => onChange(event.target.value)}
        pattern={pattern}
        placeholder={placeholder}
        type="text"
        value={value}
      />
    </section>
  )
}
