import type { ConvexHttpClient } from 'convex/browser'
import { checkSyncUrl, deleteSyncedData, expectedSchemaVersion } from './sync-client.utils'

const { mutationMock, queryMock } = vi.hoisted(() => ({ mutationMock: vi.fn<ConvexHttpClient['mutation']>(), queryMock: vi.fn<ConvexHttpClient['query']>() }))

vi.mock(import('convex/browser'), () => ({
  // a real class, not `vi.fn().mockImplementation(() => ({...}))` — an arrow-function mock implementation isn't constructible, and this is called with `new`
  ConvexHttpClient: class MockConvexHttpClient {
    public mutation = mutationMock
    public query = queryMock
  } as unknown as typeof ConvexHttpClient,
}))

describe('checkSyncUrl', () => {
  beforeEach(() => {
    queryMock.mockReset()
  })

  it('A returns ok when the deployment responds with the expected schema version', async () => {
    queryMock.mockResolvedValue({ ok: true, schemaVersion: expectedSchemaVersion })
    const result = await checkSyncUrl('https://valid.convex.cloud')
    expect(result).toStrictEqual({ ok: true })
  })

  it('B returns unreachable when the call rejects (wrong URL, network error, not a WhatNow deployment)', async () => {
    queryMock.mockRejectedValue(new Error('not found'))
    const result = await checkSyncUrl('https://not-a-real-deployment.example.com')
    expect(result).toStrictEqual({ ok: false, reason: 'unreachable' })
  })

  it('C returns stale-schema when the deployment responds with an older schema version', async () => {
    queryMock.mockResolvedValue({ ok: true, schemaVersion: expectedSchemaVersion - 1 })
    const result = await checkSyncUrl('https://outdated.convex.cloud')
    expect(result).toStrictEqual({ ok: false, reason: 'stale-schema' })
  })
})

describe('deleteSyncedData', () => {
  beforeEach(() => {
    mutationMock.mockReset()
  })

  it('A returns ok when the wipe mutation succeeds', async () => {
    // oxlint-disable-next-line unicorn/no-null -- mirrors the real clearAllTasks mutation's v.null() return validator
    mutationMock.mockResolvedValue(null)
    const result = await deleteSyncedData('https://valid.convex.cloud')
    expect(result).toStrictEqual({ ok: true })
  })

  it('B returns not-ok when the wipe mutation rejects', async () => {
    mutationMock.mockRejectedValue(new Error('network down'))
    const result = await deleteSyncedData('https://unreachable.convex.cloud')
    expect(result).toStrictEqual({ ok: false })
  })
})
