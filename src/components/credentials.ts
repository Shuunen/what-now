import { div, on, readClipboard, text, tw } from 'shuutils'
import { airtableValidate } from '../utils/airtable'
import { form } from '../utils/dom'
import { logger } from '../utils/logger'
import { state, watchState } from '../utils/state'

const credentials = div('credentials hidden pt-4')

const message = text(tw('pb-2 leading-7'), `
  This webapp has been deployed from this open-source code <a class="border-b" href="https://github.com/Shuunen/what-now" target="_blank">on Github</a>. <br>
  Please check the above link to be introduced to this app : what is it and how to use it.
`)
credentials.append(message)

const fields = [
  { href: 'https://airtable.com/api', label: 'Airtable api base', link: 'find my api base', maxlength: 17, name: 'airtable-api-base', pattern: '^app\\w{14}$' },
  { href: 'https://airtable.com/create/tokens', label: 'Airtable api token', link: 'find my api token', maxlength: 100, name: 'airtable-api-token', pattern: '^pat[\\w\\.]{50,100}$' },
  { href: 'https://developers.meethue.com/develop/get-started-2/', label: 'Hue status light', link: 'find my endpoint', maxlength: 150, name: 'hue-status-light', pattern: '^https://.+/api/\\w+/lights/\\d+/state$' },
]
const formElement = form(fields, 'Use these')
credentials.append(formElement)

function getFormCredentials () {
  const base = (formElement.elements[0] as HTMLInputElement).value // eslint-disable-line @typescript-eslint/consistent-type-assertions
  const token = (formElement.elements[1] as HTMLInputElement).value // eslint-disable-line @typescript-eslint/consistent-type-assertions
  const hue = (formElement.elements[2] as HTMLInputElement).value // eslint-disable-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-magic-numbers
  const isOk = airtableValidate(base, token)
  state.statusError = isOk ? '' : 'Invalid credentials'
  return { base, hue, isOk, token }
}

formElement.addEventListener('submit', (event: Event) => {
  event.preventDefault()
  const { base, hue, isOk, token } = getFormCredentials()
  if (!isOk) return
  state.apiBase = base
  state.apiToken = token
  state.hueEndpoint = hue
  state.isSetup = true
})

function fillForm (base: string, token: string, hue: string) {
  logger.info('credentials, fill form', { base, hue, token })
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const inputs = Array.from(formElement.elements).filter((element) => element instanceof HTMLInputElement) as HTMLInputElement[]
  for (const input of inputs)
    if (input.name === 'airtable-api-base' && base.length > 0) input.value = base
    else if (input.name === 'airtable-api-token' && token.length > 0) input.value = token
    else if (hue.length > 0) input.value = hue
    else logger.debug('nothing to fill')
}

watchState('isSetup', () => {
  credentials.classList.toggle('hidden', state.isSetup)
  fillForm(state.apiBase, state.apiToken, state.hueEndpoint)
})

on('focus', async () => {
  if (state.isSetup) return
  const clipboard = await readClipboard()
  // clipboard can contains something like : "appABC
  // patXYZ
  // https://zob.com"
  const regex = /"(?<app>app\w+)\n(?<token>token\w+)\n(?<hue>http[^"]+)"/u
  const { app = '', hue = '', token = '' } = regex.exec(clipboard)?.groups ?? {}
  fillForm(app, token, hue)
})

export { credentials }
