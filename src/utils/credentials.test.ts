import { checkUrlCredentials, parseClipboard, validateCredentials } from './credentials.utils'
import { state } from './state.utils'

const validUuid = '12345678-90ab-cdef-ffff-ffffffffffff'
const invalidUuid = '12345678-90ab-cdef-ffff-ffffffffffff!'
const validUrl = 'https://zob.com'

describe('parseClipboard', () => {
  it('A empty', () => {
    const { apiCollection, apiDatabase, webhook } = parseClipboard('')
    expect(apiCollection).toBe('')
    expect(apiDatabase).toBe('')
    expect(webhook).toBe('')
  })

  it('B one is invalid', () => {
    const { apiCollection, apiDatabase, webhook } = parseClipboard(`"${invalidUuid}\n${validUuid}\n${validUrl}"`)
    expect(apiCollection).toBe('')
    expect(apiDatabase).toBe('')
    expect(webhook).toBe('')
  })

  it('C all are valid', () => {
    const { apiCollection, apiDatabase, webhook } = parseClipboard(`"${validUuid}\n${validUuid}\n${validUrl}"`)
    expect(apiCollection).toBe(validUuid)
    expect(apiDatabase).toBe(validUuid)
    expect(webhook).toBe(validUrl)
  })
})

describe('validateCredentials', () => {
  it('A', () => {
    expect(validateCredentials('A')).toBe(false)
  })

  it('B valid credentials', () => {
    expect(validateCredentials(validUuid, validUuid)).toBe(true)
  })
})

describe('checkUrlCredentials', () => {
  it('A nothing setup', () => {
    expect(checkUrlCredentials()).toBe(false)
  })

  it('B giving valid hash', () => {
    expect(checkUrlCredentials(`#${validUuid}&${validUuid}`)).toBe(true)
  })

  it('C giving invalid hash', () => {
    state.apiDatabase = ''
    state.apiCollection = ''
    const hasSucceed = checkUrlCredentials(`#${invalidUuid}&${validUuid}`)
    expect(hasSucceed).toBe(false)
  })

  it('D with a with valid base & token in state', () => {
    state.apiDatabase = validUuid
    state.apiCollection = validUuid
    const hasSucceed = checkUrlCredentials()
    expect(hasSucceed).toBe(true)
  })
})
