import { fetchRaw } from './fetch.utils'

describe('fetchRaw', () => {
  it('returns an ok Result when fetch succeeds', async () => {
    const response = new Response('ok')
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(response))
    const result = await fetchRaw('https://example.com', {})
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toBe(response)
    vi.unstubAllGlobals()
  })

  it('returns an error Result when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new Error('network down')))
    const result = await fetchRaw('https://example.com', {})
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('network down')
    vi.unstubAllGlobals()
  })
})
