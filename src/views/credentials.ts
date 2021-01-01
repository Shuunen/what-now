import { storage } from 'shuutils'
import { div, form, p } from '../utils'

export const credentials = div()

const message = p(`
  This webapp rely on <a class="border-b" href="https://airtable.com" target="_blank">Airtable</a> to store your tasks.<br>
  You can create a Airtable free account and type your credentials below. <br>
  Your data will stay between you and Airtable, check this open-source code <a class="border-b" href="https://github.com/Shuunen/what-now" target="_blank">on Github</a>.
`, 'leading-6 py-2')
credentials.append(message)

const fields = [
  { name: 'airtable-api-base', label: 'Airtable api base', pattern: '^app\\w{14}$', link: 'find my api base', href: 'https://airtable.com/api' },
  { name: 'airtable-api-key', label: 'Airtable api key', pattern: '^key\\w{14}$', link: 'find my api key', href: 'https://airtable.com/account' }
]
const formElement = form(fields, 'Use these')
credentials.append(formElement)

formElement.addEventListener('submit', async (event: Event) => {
  event.preventDefault()
  await storage.set('api-base', (formElement.elements[0] as HTMLInputElement).value)
  await storage.set('api-key', (formElement.elements[1] as HTMLInputElement).value)
  document.location.reload()
})
