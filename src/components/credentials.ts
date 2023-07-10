import { div, on, readClipboard, text, tw } from 'shuutils'
import { airtableValidate } from '../utils/airtable.utils'
import { parseClipboard } from '../utils/credentials.utils'
import { form } from '../utils/dom.utils'
import { logger } from '../utils/logger.utils'
import { state, watchState, type CredentialField } from '../utils/state.utils'

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
] as const
const formElement = form(fields, 'Use these')
credentials.append(formElement)

function getFormCredentials () {
  const apiBase = (formElement.elements[0] as HTMLInputElement).value // eslint-disable-line @typescript-eslint/consistent-type-assertions
  const apiToken = (formElement.elements[1] as HTMLInputElement).value // eslint-disable-line @typescript-eslint/consistent-type-assertions
  const hueEndpoint = (formElement.elements[2] as HTMLInputElement).value // eslint-disable-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-magic-numbers
  const isOk = airtableValidate(apiBase, apiToken)
  state.statusError = isOk ? '' : 'Invalid credentials'
  return { apiBase, apiToken, hueEndpoint, isOk } satisfies Record<CredentialField, string> & { isOk: boolean }
}

formElement.addEventListener('submit', (event: Event) => {
  event.preventDefault()
  const { apiBase, apiToken, hueEndpoint, isOk } = getFormCredentials()
  if (!isOk) return
  state.apiBase = apiBase
  state.apiToken = apiToken
  state.hueEndpoint = hueEndpoint
  state.isSetup = true
})

function fillForm (data: Record<CredentialField, string>) {
  logger.info('credentials, fill form', data)
  const { apiBase, apiToken, hueEndpoint } = data
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const inputs = Array.from(formElement.elements).filter((element) => element instanceof HTMLInputElement) as HTMLInputElement[]
  for (const input of inputs)
    if (input.name === fields[0].name && apiBase.length > 0) input.value = apiBase
    else if (input.name === fields[1].name && apiToken.length > 0) input.value = apiToken
    else if (hueEndpoint.length > 0) input.value = hueEndpoint
    else logger.debug('nothing to fill')
}

watchState('isSetup', () => {
  credentials.classList.toggle('hidden', state.isSetup)
  fillForm(state)
})

on('focus', async () => {
  if (state.isSetup) return
  const clipboard = await readClipboard()
  fillForm(parseClipboard(clipboard))
})

export { credentials }
