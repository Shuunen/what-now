import { FormField } from './models'

export const dom = (type: string, content = '', classes = '') => {
  const element = document.createElement(type)
  element.className = classes
  element.innerHTML = content
  return element
}

export const div = (classes: string) => dom('div', '', classes)

export const img = (src: string, classes = '') => {
  const element = dom('img', '', classes) as HTMLImageElement
  element.src = src
  return element
}

export const button = (content: string, classes = '') => {
  return dom('button', content, `bg-blue-800 m-auto sm:ml-0 px-4 py-1 ${classes}`)
}

export const p = (content: string, classes = '') => dom('p', content, classes)

export const form = (fields: FormField[], validate = 'Send form') => {
  const element = dom('form', '', 'gap-4 grid mt-4') as HTMLFormElement
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

const headersJson = { Accept: 'application/json', 'Content-Type': 'application/json' }
export const patch = async (url: string, data: Record<string, unknown>) => fetch(url, { headers: headersJson, method: 'patch', body: JSON.stringify(data) })
