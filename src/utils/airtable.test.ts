import { expect, it } from 'vitest'
import { airtableHeaders, airtableValidate, checkCredentials } from './airtable.utils'
import { state } from './state.utils'

it('airtableValidate A', () => {
  expect(airtableValidate('A')).toBe(false)
})

it('checkCredentials A nothing setup', () => {
  expect(checkCredentials()).toBe(false)
})

it('checkCredentials B giving valid hash', () => {
  expect(checkCredentials('#app12345654987123&pat12345654987123azdazdzadazdzadaz465465468479649646azd46az465azdazd')).toBe(true)
})

it('checkCredentials C giving invalid hash', () => {
  state.apiBase = ''
  state.apiToken = ''
  const hasSucceed = checkCredentials('#app12343&pat12345654987123azdazdzadazdzadaz465465468479649646azd46az465azdazd')
  expect(hasSucceed).toBe(false)
})

it('checkCredentials D with a with valid base & token in state', () => {
  state.apiBase = 'app12345654987123'
  state.apiToken = 'pat12345654987123azdazdzadazdzadaz465465468479649646azd46az465azdazd'
  const hasSucceed = checkCredentials()
  expect(hasSucceed).toBe(true)
})

it('airtableHeaders A', () => {
  const headers = airtableHeaders('pat123546')
  expect(headers).toMatchSnapshot()
})
