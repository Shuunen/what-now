import { stringify } from './stringify.utils'

describe('stringify', () => {
  it('returns "undefined" for undefined', () => {
    expect(stringify(undefined)).toBe('undefined')
  })

  it('returns "null" for null', () => {
    // oxlint-disable-next-line unicorn/no-null -- testing the null-handling branch specifically
    expect(stringify(null)).toBe('null')
  })

  it('returns the string as-is', () => {
    expect(stringify('hello')).toBe('hello')
  })

  it('serializes an object', () => {
    expect(stringify({ a: 1 })).toBe('{"a":1}')
  })

  it('coerces other types to string', () => {
    expect(stringify(42)).toBe('42')
  })
})
