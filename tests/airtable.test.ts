import { expect, it } from 'vitest'
import { airtableValidate, checkCredentials } from '../src/utils/airtable'
import { state } from '../src/utils/state'

it('airtableValidate A', () => {
  expect(airtableValidate('A')).toBe(false)
})

it('checkCredentials A nothing setup', () => {
  expect(checkCredentials()).toBe(false)
})

it('checkCredentials B giving valid hash', () => {
  expect(checkCredentials('#app12345654987123&key12345654987123')).toBe(true)
})

it('checkCredentials C giving invalid hash', () => {
  state.apiBase = ''
  state.apiKey = ''
  const hasSucceed = checkCredentials('#app12343&key12345654987123')
  expect(hasSucceed).toBe(false)
})

it('checkCredentials D with a with valid base & key in state', () => {
  state.apiBase = 'app12345654987123'
  state.apiKey = 'key12345654987123'
  const hasSucceed = checkCredentials()
  expect(hasSucceed).toBe(true)
})
