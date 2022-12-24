import { div, text, tw } from 'shuutils'
import { state, watchState } from '../state'
import { airtableValidate } from '../utils/airtable'
import { form } from '../utils/dom'

const credentials = div('credentials hidden')

const message = text(tw('pb-2 leading-7'), `
  This webapp has been deployed from this open-source code <a class="border-b" href="https://github.com/Shuunen/what-now" target="_blank">on Github</a>. <br>
  Please check the above link to be introduced to this app : what is it and how to use it.
`)
credentials.append(message)

const fields = [
  { name: 'airtable-api-base', label: 'Airtable api base', pattern: '^app\\w{14}$', link: 'find my api base', href: 'https://airtable.com/api' },
  { name: 'airtable-api-key', label: 'Airtable api key', pattern: '^key\\w{14}$', link: 'find my api key', href: 'https://airtable.com/account' },
]
const formElement = form(fields, 'Use these')
credentials.append(formElement)

function getFormCredentials (): { base: string; key: string; isOk: boolean } {
  const base = (formElement.elements[0] as HTMLInputElement).value // eslint-disable-line @typescript-eslint/consistent-type-assertions
  const key = (formElement.elements[1] as HTMLInputElement).value // eslint-disable-line @typescript-eslint/consistent-type-assertions
  const isOk = airtableValidate(base, key)
  state.statusError = isOk ? '' : 'Invalid credentials'
  return { base, key, isOk }
}

formElement.addEventListener('submit', (event: Event) => {
  event.preventDefault()
  const { base, key, isOk } = getFormCredentials()
  if (!isOk) return
  state.apiBase = base
  state.apiKey = key
  state.isSetup = true
})

watchState('isSetup', () => { credentials.classList.toggle('hidden', state.isSetup) })

export { credentials }
