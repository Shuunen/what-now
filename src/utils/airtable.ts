import type { AirtableResponse } from '../types'
import { logger } from './logger'
import { state } from './state'

const baseKeyLength = 17

/* c8 ignore next 11 */
export async function airtablePatch (url: string, data: { [key: string]: unknown }): Promise<AirtableResponse> {
  if (typeof window === 'undefined') return { records: [] }
  const response = await fetch(url, {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return await response.json() as AirtableResponse
}

/* c8 ignore next 9 */
export async function airtableGet (url: string): Promise<AirtableResponse> {
  if (typeof window === 'undefined') return { records: [] }
  const response = await fetch(url, {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    headers: { Accept: 'application/json' },
  })
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return await response.json() as AirtableResponse
}

export function airtableValidate (base?: string, key?: string): boolean {
  const isBaseOk = base !== undefined && typeof base === 'string' && base.length === baseKeyLength
  const isKeyOk = key !== undefined && typeof key === 'string' && key.length === baseKeyLength
  return isBaseOk && isKeyOk
}

export function airtableUrl (base: string, key: string, target = ''): string {
  if (!airtableValidate(base, key)) return ''
  return `https://api.airtable.com/v0/${base}/${target}?api_key=${key}&view=todo`
}

export function checkCredentials (hash = ''): boolean {
  logger.info('check credentials', hash.length > 0 ? `and detected hash "${hash}"` : '')
  const matches = /#(?<app>app\w{14})&(?<key>key\w{14})/u.exec(hash)
  if (matches?.groups?.app !== undefined && matches.groups.key !== undefined && airtableValidate(matches.groups.app, matches.groups.key)) {
    state.apiBase = matches.groups.app
    state.apiKey = matches.groups.key
    logger.info('credentials found in hash')
  }
  state.isSetup = airtableValidate(state.apiBase, state.apiKey)
  logger.info('credentials are', state.isSetup ? 'valid' : 'invalid')
  state.statusInfo = state.isSetup ? '' : 'Welcome dear user !'
  return state.isSetup
}

