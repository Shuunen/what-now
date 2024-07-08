import type { AirtableResponse } from '../types'
import { logger } from './logger.utils'
import { state } from './state.utils'

const baseLength = 17
const minTokenLength = 50

/**
 * Airtable headers
 * @param token the token to use
 * @returns the headers for airtable
 */
export function airtableHeaders (token: string) {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  return { 'Accept': 'application/json', 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
}

/* c8 ignore next 16 */
/**
 * Airtable patch
 * @param url the url to patch
 * @param data the data to patch
 * @returns the response
 */
export async function airtablePatch (url: string, data: Readonly<Record<string, unknown>>) {
  if (typeof window === 'undefined') return { records: [] }
  const response = await fetch(url, {
    body: JSON.stringify(data),
    headers: airtableHeaders(state.apiToken),
    method: 'PATCH',
  })
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return await response.json() as AirtableResponse
}

/* c8 ignore next 14 */
/**
 * Airtable get
 * @param url the url to get
 * @returns the response
 */
export async function airtableGet (url: string) {
  if (typeof window === 'undefined') return { records: [] }
  const response = await fetch(url, {
    headers: airtableHeaders(state.apiToken),
  })
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return await response.json() as AirtableResponse
}

/**
 * Airtable validate
 * @param base the base to use
 * @param token the token to use
 * @returns true if the base and token are valid
 */
export function airtableValidate (base?: string, token?: string) {
  const isBaseOk = base !== undefined && typeof base === 'string' && base.length === baseLength
  const isTokenOk = token !== undefined && typeof token === 'string' && token.length > minTokenLength
  return isBaseOk && isTokenOk
}

/**
 * Airtable url
 * @param base the base
 * @param target the target
 * @returns the url
 */
export function airtableUrl (base: string, target: string) {
  return `https://api.airtable.com/v0/${base}/${target}?view=todo`
}

/**
 * Check credentials
 * @param hash the hash to check
 * @returns true if the credentials are valid
 */
// eslint-disable-next-line complexity
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

