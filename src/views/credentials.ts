import { emit } from 'shuutils'
import { div, form, p } from '../utils'

export const credentials = div('credentials')

const message = p(`
  This webapp has been deployed from the open-source code <a class="border-b" href="https://github.com/Shuunen/what-now" target="_blank">on Github</a>. <br>
  Please check the above link to be introduced to this app : what is it and how to use it.
`, 'leading-6 py-2')
credentials.append(message)

const fields = [
  { name: 'airtable-api-base', label: 'Airtable api base', pattern: '^app\\w{14}$', link: 'find my api base', href: 'https://airtable.com/api' },
  { name: 'airtable-api-key', label: 'Airtable api key', pattern: '^key\\w{14}$', link: 'find my api key', href: 'https://airtable.com/account' },
]
const formElement = form(fields, 'Use these')
credentials.append(formElement)

formElement.addEventListener('submit', async (event: Event) => {
  event.preventDefault()
  const base = (formElement.elements[0] as HTMLInputElement).value
  const key = (formElement.elements[1] as HTMLInputElement).value
  emit('save-credentials', { base, key })
})
