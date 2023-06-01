import { div, on, readClipboard, text, tw } from 'shuutils'
import { airtableValidate } from '../utils/airtable'
import { form } from '../utils/dom'
import { logger } from '../utils/logger'
import { state, watchState } from '../utils/state'

const credentials = div('credentials hidden')

const message = text(tw('pb-2 leading-7'), `
  This webapp has been deployed from this open-source code <a class="border-b" href="https://github.com/Shuunen/what-now" target="_blank">on Github</a>. <br>
  Please check the above link to be introduced to this app : what is it and how to use it.
`)
credentials.append(message)

const fields = [
  { name: 'airtable-api-base', label: 'Airtable api base', pattern: '^app\\w{14}$', link: 'find my api base', href: 'https://airtable.com/api', maxlength: 17 },
  { name: 'airtable-api-key', label: 'Airtable api key', pattern: '^key\\w{14}$', link: 'find my api key', href: 'https://airtable.com/account', maxlength: 17 },
  { name: 'hue-status-light', label: 'Hue status light', pattern: '^https://.+/api/\\w+/lights/\\d+/state$', link: 'find my endpoint', href: 'https://developers.meethue.com/develop/get-started-2/', maxlength: 150 },
]
const formElement = form(fields, 'Use these')
credentials.append(formElement)

function getFormCredentials () {
  const base = (formElement.elements[0] as HTMLInputElement).value // eslint-disable-line @typescript-eslint/consistent-type-assertions
  const key = (formElement.elements[1] as HTMLInputElement).value // eslint-disable-line @typescript-eslint/consistent-type-assertions
  const hue = (formElement.elements[2] as HTMLInputElement).value // eslint-disable-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-magic-numbers
  const isOk = airtableValidate(base, key)
  state.statusError = isOk ? '' : 'Invalid credentials'
  return { base, key, hue, isOk }
}

formElement.addEventListener('submit', (event: Event) => {
  event.preventDefault()
  const { base, key, hue, isOk } = getFormCredentials()
  if (!isOk) return
  state.apiBase = base
  state.apiKey = key
  state.hueEndpoint = hue
  state.isSetup = true
})

watchState('isSetup', () => { credentials.classList.toggle('hidden', state.isSetup) })

on('focus', async () => {
  const clipboard = await readClipboard()
  // clipboard can contains something like : "appABC
  // keyXYZ
  // https://zob.com"
  const regex = /"(?<app>app\w+)\n(?<key>key\w+)\n(?<hue>http[^"]+)"/u
  const { app = '', key = '', hue = '' } = regex.exec(clipboard)?.groups ?? {}
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const inputs = Array.from(formElement.elements).filter((element) => element instanceof HTMLInputElement) as HTMLInputElement[]
  for (const input of inputs)
    if (input.name === 'airtable-api-base') input.value = app
    else if (input.name === 'airtable-api-key') input.value = key
    else input.value = hue
  logger.debug('clipboard', { app, key, hue })
})

export { credentials }
