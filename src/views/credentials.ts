import { storage } from 'shuutils'
import { button, div, dom, p } from '../utils'

export const credentials = div()

const message = p(`
  This webapp rely on <a class="border-b" href="https://airtable.com" target="_blank">Airtable</a> to store your tasks.<br>
  You can create a Airtable free account and type your credentials below. <br>
  Your data will stay between you and Airtable, check this open-source code <a class="border-b" href="https://github.com/Shuunen/what-now" target="_blank">on Github</a>.
`, 'leading-6 py-2')
credentials.append(message)

const form = dom('form', '', 'gap-4 grid mt-4') as HTMLFormElement
const fields = [
  {
    name: 'airtable-api-base',
    label: 'Airtable api base',
    pattern: '^app\\w{14}$',
    link: 'find my api base',
    href: 'https://airtable.com/api'
  },
  {
    name: 'airtable-api-key',
    label: 'Airtable api key',
    pattern: '^key\\w{14}$',
    link: 'find my api key',
    href: 'https://airtable.com/account'
  }
]
form.innerHTML = fields.map(field => `<label class="grid gap-4 sm:grid-cols-3">
    <span>${field.label}</span>
    <input class="bg-blue-900 px-2" name="${field.name}" pattern="${field.pattern}" maxlength="17" required>
    <a class="ml-auto sm:ml-4" href="${field.href}" target="_blank">
      <span class="border-b">${field.link}</span>
      <svg class="h-4 inline ml-2 w-4"><use xlink:href="icons.svg#external"></use></svg>
    </a>
  </label>`).join('')
form.append(button('Use these'))
credentials.append(form)

form.addEventListener('submit', async (event: Event) => {
  event.preventDefault()
  await storage.set('api-base', (form.elements[0] as HTMLInputElement).value)
  await storage.set('api-key', (form.elements[1] as HTMLInputElement).value)
  document.location.reload()
})
