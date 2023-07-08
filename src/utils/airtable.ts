import type { AirtableResponse } from '../types'
import { logger } from './logger'
import { state } from './state'

const baseLength = 17
const minTokenLength = 50

export function airtableHeaders (token: string) {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  return { 'Accept': 'application/json', 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
}

/* c8 ignore next 11 */
export async function airtablePatch (url: string, data: { [key: string]: unknown }) {
  if (typeof window === 'undefined') return { records: [] }
  const response = await fetch(url, {
    body: JSON.stringify(data),
    headers: airtableHeaders(state.apiToken),
    method: 'PATCH',
  })
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return await response.json() as AirtableResponse
}

/* c8 ignore next 9 */
export async function airtableGet (url: string) {
  if (typeof window === 'undefined') return { records: [] }
  const response = await fetch(url, {
    headers: airtableHeaders(state.apiToken),
  })
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return await response.json() as AirtableResponse
}

export function airtableValidate (base?: string, token?: string) {
  const isBaseOk = base !== undefined && typeof base === 'string' && base.length === baseLength
  const isTokenOk = token !== undefined && typeof token === 'string' && token.length > minTokenLength
  return isBaseOk && isTokenOk
}

export function airtableUrl (base: string, target: string) {
  return `https://api.airtable.com/v0/${base}/${target}?view=todo`
}

export function checkCredentials (hash = '') {
  logger.info('check credentials', hash.length > 0 ? `and detected hash "${hash}"` : '')
  const matches = /#(?<app>app\w{14})&(?<token>pat[\w.]{50,100})/u.exec(hash)
  if (matches?.groups?.app !== undefined && matches.groups.token !== undefined && airtableValidate(matches.groups.app, matches.groups.token)) {
    state.apiBase = matches.groups.app
    state.apiToken = matches.groups.token
    logger.info('credentials found in hash')
  }
  state.isSetup = airtableValidate(state.apiBase, state.apiToken)
  logger.info('credentials are', state.isSetup ? 'valid' : 'invalid')
  state.statusInfo = state.isSetup ? '' : 'Welcome dear user !'
  return state.isSetup
}

