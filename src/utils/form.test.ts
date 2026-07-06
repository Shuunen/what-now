import { testIdFromProps } from './form.utils'

describe('testIdFromProps', () => {
  it('derives a kebab-case testid from a prefix and camelCase name', () => {
    expect(testIdFromProps('button', { name: 'saveCredentials' })).toBe('button-save-credentials')
  })

  it('throws when prefix is empty', () => {
    expect(() => testIdFromProps('', { name: 'foo' })).toThrow('prefix cannot be empty string')
  })

  it('throws when name is empty', () => {
    expect(() => testIdFromProps('button', { name: '' })).toThrow('name cannot be empty string')
  })
})
