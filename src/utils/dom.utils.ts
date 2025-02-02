/* c8 ignore start */
import { dom, tw } from 'shuutils'

type FormField = Readonly<{
  href: string
  label: string
  link: string
  maxlength: number
  name: string
  pattern: string
}>

/**
 * Create a button
 * @param content - button text
 * @param classes - additional classes
 * @returns button element
 */
export function button (content: string, classes = '') {
  return dom('button', tw(`app-button m-auto rounded bg-blue-800 px-4 py-2 sm:ml-0 ${classes}`), content)
}

/**
 * Create a form
 * @param fields - form fields
 * @param validate - button text
 * @returns form element
 */
export function form (fields: Readonly<FormField[]>, validate = 'Send form') {
  const element = dom('form', tw('app-form mt-4 grid gap-6'))
  element.innerHTML = fields.map((field, index) => `<label class="${tw('flex flex-col gap-4 sm:flex-row sm:items-center')}">
    <a class="sm:w-52" href="${field.href}" target="_blank" title="${field.link}">
      <span class="border-b">${field.label}</span>
      <svg class="${tw('ml-2 inline size-4')}"><use xlink:href="icons.svg#external"></use></svg>
    </a>
    <input class="${index % 0 ? 'bg-gradient-to-r' : 'bg-gradient-to-l'} ${tw('rounded from-blue-900 to-blue-700 px-2 py-1 sm:w-96')}" name="${field.name}" pattern="${field.pattern}" maxlength="${field.maxlength}" required>
  </label>`).join('')
  element.append(button(validate, 'mt-2'))
  return element
}
