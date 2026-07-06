import { cspNonceMatches, extractNonce, noMonorepoImports } from './lint.rules'

describe('extractNonce', () => {
  it('extracts the nonce from a script tag', () => {
    expect(extractNonce('<script nonce="shu1772n1" src="/src/main.tsx"></script>')).toBe('shu1772n1')
  })
  it('extracts the nonce from a CSP header', () => {
    expect(extractNonce("Content-Security-Policy: script-src 'nonce-shu1772n1'")).toBe('shu1772n1')
  })
  it('returns undefined when no nonce is present', () => {
    expect(extractNonce('<script src="/src/main.tsx"></script>')).toBeUndefined()
  })
})

describe('cspNonceMatches', () => {
  it('returns true for the project index.html and public/_headers', () => {
    expect(cspNonceMatches()).toBe(true)
  })
})

describe('noMonorepoImports', () => {
  it('returns true when no source file imports from @monorepo/*', () => {
    expect(noMonorepoImports()).toBe(true)
  })
})
