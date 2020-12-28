
import { strictEqual as is, throws } from 'assert'
import { checkProp, dateIso10, daysAgo, daysAgoIso10, get, has, set } from '../src/utils'

describe('utils', () => {
  const today = new Date()
  const storage = {} as Storage

  it('give a ISO 10 format', () => {
    const expected = '2018-11-30'
    is(dateIso10(new Date(expected)), expected)
  })
  it('daysAgo give today by default', () => {
    // use dateIso10 to remove milliseconds that would differ from two new Date() instances
    is(dateIso10(), dateIso10(daysAgo()))
  })
  it('daysAgoIso10 give today by default', () => {
    is(daysAgoIso10(), dateIso10(today))
  })
  it('checkProp throws on empty', () => {
    throws(() => checkProp('malone', { malone: '' }))
  })
  it('checkProp throws on undefined', () => {
    throws(() => checkProp('malone', { kevin: 42 }))
  })
  it('store a string', async () => {
    const key = 'Michael'
    const value = 'Scott'
    const exists = await has(key, storage)
    is(exists, false)
    await set(key, value, storage)
    const dug = await get(key, storage)
    is(dug, value)
  })
  it('store an object', async () => {
    const key = 'Holly'
    const value = 'Flax'
    await set(key, { lastName: value }, storage)
    const exists = await has(key, storage)
    is(exists, true)
    const dug = await get(key, storage)
    is(dug.lastName, value)
  })
})
