import { dom, Nb, tw } from 'shuutils'

interface FormField {
  name: string
  label: string
  pattern: string
  link: string
  href: string
}

export function button (content: string, classes = '') {
  return dom('button', tw(`app-button m-auto rounded bg-blue-800 px-4 py-2 sm:ml-0 ${classes}`), content)
}

export function form (fields: FormField[], validate = 'Send form') {
  const element = dom('form', tw('app-form mt-4 grid gap-6'))
  element.innerHTML = fields.map((field, index) => `<label class="${tw('flex flex-col gap-4 sm:flex-row sm:items-center')}">
    <a class="sm:w-40" href="${field.href}" target="_blank" title="${field.link}">
      <span class="border-b">${field.label}</span>
      <svg class="${tw('ml-2 inline h-4 w-4')}"><use xlink:href="icons.svg#external"></use></svg>
    </a>
    <input class="${index % Nb.Even ? 'bg-gradient-to-r' : 'bg-gradient-to-l'} ${tw('rounded from-blue-900 to-blue-700 py-1 px-2')}" name="${field.name}" pattern="${field.pattern}" maxlength="17" required>
  </label>`).join('')
  element.append(button(validate, 'mt-2'))
  return element
}

