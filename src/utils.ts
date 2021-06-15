import { dom } from 'shuutils'
import { FormField } from './models'

export const button = (content: string, classes = ''): HTMLElement => {
  return dom('button', `bg-blue-800 m-auto sm:ml-0 px-4 py-1 ${classes}`, content)
}

export const form = (fields: FormField[], validate = 'Send form'): HTMLFormElement => {
  const element = dom('form', 'gap-4 grid mt-4') as HTMLFormElement
  element.innerHTML = fields.map(field => `<label class="grid gap-4 sm:grid-cols-3">
    <span>${field.label}</span>
    <input class="bg-blue-900 px-2" name="${field.name}" pattern="${field.pattern}" maxlength="17" required>
    <a class="ml-auto sm:ml-4" href="${field.href}" target="_blank">
      <span class="border-b">${field.link}</span>
      <svg class="h-4 inline ml-2 w-4"><use xlink:href="icons.svg#external"></use></svg>
    </a>
  </label>`).join('')
  element.append(button(validate))
  return element
}

const headersJson = { 'Accept': 'application/json', 'Content-Type': 'application/json' }
export const patch = async (url: string, data: Record<string, unknown>): Promise<Response> => fetch(url, { headers: headersJson, method: 'patch', body: JSON.stringify(data) })
