import { act, renderHook, waitFor } from '@testing-library/react'
import type { ConvexReactClient } from 'convex/react'
import { defaultAppData } from '../schemas/app-data'
import type { Task } from '../schemas/task'
import { useAppStore } from '../store/use-app-store'
import { logger } from '../utils/logger.utils'
import { taskMock } from '../utils/tasks.utils'
import { connectTimeoutMs } from './sync-session'
import { useSync } from './use-sync'

const { closeMock, constructMock, mutationMock, watchQueryMock } = vi.hoisted(() => ({
  closeMock: vi.fn<ConvexReactClient['close']>(),
  constructMock: vi.fn<(address: string) => void>(),
  mutationMock: vi.fn<ConvexReactClient['mutation']>(),
  watchQueryMock: vi.fn<ConvexReactClient['watchQuery']>(),
}))

type FakeWatch = { journal: () => undefined; localQueryResult: () => Task[] | undefined; onUpdate: (listener: () => void) => () => void }

/**
 * Builds a controllable fake `Watch<Task[]>`, driven manually in tests via `emit`/`emitError`.
 * @returns `emit`/`emitError` to drive the fake, and `watch` to hand to the mocked `watchQuery`
 */
function createFakeWatch() {
  let result: Task[] | undefined = undefined
  let thrownError: Error | undefined = undefined
  const listeners = new Set<() => void>()
  const watch: FakeWatch = {
    journal: () => undefined,
    localQueryResult: () => {
      if (thrownError !== undefined) throw thrownError
      return result
    },
    onUpdate: listener => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
  return {
    emit(tasks: Task[]) {
      result = tasks
      thrownError = undefined
      for (const listener of listeners) listener()
    },
    emitError(error: Error) {
      thrownError = error
      for (const listener of listeners) listener()
    },
    watch,
  }
}

// a real class, not `vi.fn().mockImplementation(() => ({...}))` — an arrow-function mock implementation isn't
// constructible, and this is called with `new`, matching the pattern in src/db/sync-client.test.ts
vi.mock(import('convex/react'), () => ({
  ConvexReactClient: class MockConvexReactClient {
    public close = closeMock
    public mutation = mutationMock
    public watchQuery = watchQueryMock

    public constructor(address: string) {
      constructMock(address)
    }
  } as unknown as typeof ConvexReactClient,
}))

describe('useSync', () => {
  beforeEach(() => {
    vi.useRealTimers()
    useAppStore.setState({ data: defaultAppData, isLoading: true })
    closeMock.mockReset()
    constructMock.mockReset()
    // oxlint-disable-next-line unicorn/no-null -- mirrors the real `upsertTask` mutation's `v.null()` return validator, which is `null` at runtime
    mutationMock.mockReset().mockResolvedValue(null)
    watchQueryMock.mockReset()
  })

  it('A is off and builds no client when syncUrl is empty', () => {
    useAppStore.getState().loadData(defaultAppData)
    const { result } = renderHook(() => useSync())
    expect(result.current).toBe('off')
    expect(constructMock).not.toHaveBeenCalled()
  })

  it('A2 stays connecting and builds no client while local hydration is still pending', () => {
    useAppStore.getState().setSyncUrl('https://sync.convex.cloud')
    const { result } = renderHook(() => useSync())
    expect(result.current).toBe('connecting')
    expect(constructMock).not.toHaveBeenCalled()
  })

  it('B connects and becomes synced once the subscription reports an empty task set', async () => {
    const fakeWatch = createFakeWatch()
    watchQueryMock.mockReturnValue(fakeWatch.watch)
    useAppStore.getState().loadData(defaultAppData)
    useAppStore.getState().setSyncUrl('https://sync.convex.cloud')
    const { result } = renderHook(() => useSync())
    await waitFor(() => expect(constructMock).toHaveBeenCalledWith('https://sync.convex.cloud'))
    fakeWatch.emit([])
    await waitFor(() => expect(result.current).toBe('synced'))
  })

  it('C adopts a remote-only task that has no local match', async () => {
    const fakeWatch = createFakeWatch()
    watchQueryMock.mockReturnValue(fakeWatch.watch)
    useAppStore.getState().loadData(defaultAppData)
    useAppStore.getState().setSyncUrl('https://sync.convex.cloud')
    renderHook(() => useSync())
    const remoteTask = taskMock({ id: 'remote-only', syncedAt: '2025-01-01T00:00:00.000Z' })
    fakeWatch.emit([remoteTask])
    await waitFor(() => expect(useAppStore.getState().data.tasks).toHaveLength(1))
    expect(useAppStore.getState().data.tasks[0]).toStrictEqual(remoteTask)
  })

  it('D merges by syncedAt, keeping the newer remote version over a stale local one', async () => {
    const fakeWatch = createFakeWatch()
    watchQueryMock.mockReturnValue(fakeWatch.watch)
    const staleLocal = taskMock({ id: 'shared', minutes: 5, syncedAt: '2025-01-01T00:00:00.000Z' })
    useAppStore.getState().loadData({ ...defaultAppData, tasks: [staleLocal] })
    useAppStore.getState().setSyncUrl('https://sync.convex.cloud')
    renderHook(() => useSync())
    const newerRemote = taskMock({ id: 'shared', minutes: 30, syncedAt: '2025-06-01T00:00:00.000Z' })
    fakeWatch.emit([newerRemote])
    await waitFor(() => expect(useAppStore.getState().data.tasks[0]?.minutes).toBe(30))
  })

  it('E skips the store update (echo guard) when a remote update matches the current local task exactly', async () => {
    const fakeWatch = createFakeWatch()
    watchQueryMock.mockReturnValue(fakeWatch.watch)
    const task = taskMock({ id: 'a', syncedAt: '2025-01-01T00:00:00.000Z' })
    useAppStore.getState().loadData({ ...defaultAppData, tasks: [task] })
    useAppStore.getState().setSyncUrl('https://sync.convex.cloud')
    renderHook(() => useSync())
    // wait for the initial local-only push (first-connection reconciliation) to fire, then use the
    // same task as the "echo" a real deployment would send back once it received that push
    await waitFor(() => expect(mutationMock).toHaveBeenCalledOnce())
    const tasksArrayReference = useAppStore.getState().data.tasks
    fakeWatch.emit([task])
    fakeWatch.emit([task])
    expect(useAppStore.getState().data.tasks).toBe(tasksArrayReference)
  })

  it('F pushes a local-only task to the deployment on connect (first-connection reconciliation)', async () => {
    const fakeWatch = createFakeWatch()
    watchQueryMock.mockReturnValue(fakeWatch.watch)
    const localOnly = taskMock({ id: 'local-only', syncedAt: '2025-01-01T00:00:00.000Z' })
    useAppStore.getState().loadData({ ...defaultAppData, tasks: [localOnly] })
    useAppStore.getState().setSyncUrl('https://sync.convex.cloud')
    renderHook(() => useSync())
    await waitFor(() => expect(mutationMock).toHaveBeenCalledOnce())
    expect(mutationMock).toHaveBeenCalledWith(expect.anything(), localOnly)
  })

  it('G does not re-push a task whose syncedAt has already been confirmed synced', async () => {
    const fakeWatch = createFakeWatch()
    watchQueryMock.mockReturnValue(fakeWatch.watch)
    const taskA = taskMock({ id: 'a', syncedAt: '2025-01-01T00:00:00.000Z' })
    const taskB = taskMock({ id: 'b', syncedAt: '2025-01-01T00:00:00.000Z' })
    useAppStore.getState().loadData({ ...defaultAppData, tasks: [taskA, taskB] })
    useAppStore.getState().setSyncUrl('https://sync.convex.cloud')
    renderHook(() => useSync())
    await waitFor(() => expect(mutationMock).toHaveBeenCalledTimes(2))
    mutationMock.mockClear()
    // an unrelated store change (editing task b) re-triggers the store subscription; task a, whose
    // syncedAt hasn't moved past its confirmed watermark, must not be pushed again
    useAppStore.getState().updateTasks([{ ...taskB, minutes: 99, syncedAt: '2025-02-01T00:00:00.000Z' }])
    await waitFor(() => expect(mutationMock).toHaveBeenCalledOnce())
    expect(mutationMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: 'b' }))
  })

  it('H logs and reports error status when a push fails, matching the use-persistence.ts logging convention', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockReturnValue(undefined)
    mutationMock.mockRejectedValue(new Error('mutation failed'))
    const fakeWatch = createFakeWatch()
    watchQueryMock.mockReturnValue(fakeWatch.watch)
    const localOnly = taskMock({ id: 'local-only', syncedAt: '2025-01-01T00:00:00.000Z' })
    useAppStore.getState().loadData({ ...defaultAppData, tasks: [localOnly] })
    useAppStore.getState().setSyncUrl('https://sync.convex.cloud')
    const { result } = renderHook(() => useSync())
    await waitFor(() => expect(result.current).toBe('error'))
    expect(errorSpy).toHaveBeenCalledWith('failed to push task to convex sync deployment', expect.objectContaining({ taskId: 'local-only' }))
  })

  it('I logs and reports error status when the subscription itself errors', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockReturnValue(undefined)
    const fakeWatch = createFakeWatch()
    watchQueryMock.mockReturnValue(fakeWatch.watch)
    useAppStore.getState().loadData(defaultAppData)
    useAppStore.getState().setSyncUrl('https://sync.convex.cloud')
    const { result } = renderHook(() => useSync())
    fakeWatch.emitError(new Error('subscription failed'))
    await waitFor(() => expect(result.current).toBe('error'))
    expect(errorSpy).toHaveBeenCalledWith('convex sync subscription reported an error', expect.objectContaining({ syncUrl: 'https://sync.convex.cloud' }))
  })

  it('J logs and reports error status when the client cannot be constructed', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockReturnValue(undefined)
    constructMock.mockImplementation(() => {
      throw new Error('bad url')
    })
    useAppStore.getState().loadData(defaultAppData)
    useAppStore.getState().setSyncUrl('not-a-valid-url')
    const { result } = renderHook(() => useSync())
    await waitFor(() => expect(result.current).toBe('error'))
    expect(errorSpy).toHaveBeenCalledWith('failed to construct convex sync client', expect.objectContaining({ syncUrl: 'not-a-valid-url' }))
  })

  // Regression: a deployment that rejects the connection outright (e.g. an unparseable deployment
  // name) has no path to 'error' — Convex logs a server "FatalError" then closes the socket with a
  // normal close code, which skips onServerDisconnectError, so watchQuery's onUpdate never fires
  // and the status was stuck at 'connecting' forever with no way for the user to tell a dead
  // deployment from a slow one. Found by /qa on 2026-07-21.
  it('N reports error status if the subscription never ticks within connectTimeoutMs, and does not re-fire once connected', async () => {
    vi.useFakeTimers()
    const errorSpy = vi.spyOn(logger, 'error').mockReturnValue(undefined)
    const fakeWatch = createFakeWatch()
    watchQueryMock.mockReturnValue(fakeWatch.watch)
    useAppStore.getState().loadData(defaultAppData)
    useAppStore.getState().setSyncUrl('https://sync.convex.cloud')
    const { result } = renderHook(() => useSync())
    // wait for `session.start()` (not just client construction) to have run, so the connect timeout is actually scheduled
    await vi.waitFor(() => expect(watchQueryMock).toHaveBeenCalledOnce())
    await act(() => vi.advanceTimersByTimeAsync(connectTimeoutMs))
    expect(result.current).toBe('error')
    expect(errorSpy).toHaveBeenCalledWith('convex sync deployment never completed its first subscription tick', expect.objectContaining({ syncUrl: 'https://sync.convex.cloud' }))
    // a late snapshot arriving after the timeout still recovers the status, and the timeout does not re-fire
    act(() => fakeWatch.emit([]))
    expect(result.current).toBe('synced')
    await act(() => vi.advanceTimersByTimeAsync(connectTimeoutMs))
    expect(result.current).toBe('synced')
    vi.useRealTimers()
  })

  it('M toggling sync off mid-push (Finding 4B) does not crash when the in-flight push later resolves, and no further pushes happen', async () => {
    const fakeWatch = createFakeWatch()
    watchQueryMock.mockReturnValue(fakeWatch.watch)
    // oxlint-disable-next-line unicorn/consistent-function-scoping -- the placeholder is intentionally trivial, real assignment happens inside the Promise executor below
    let resolvePendingPush: (value: null) => void = () => undefined
    // oxlint-disable-next-line promise/avoid-new -- deferred pattern needed to control exactly when the mocked mutation resolves, matching the precedent in src/webhook/server.cli.ts
    const pendingPush = new Promise<null>(resolve => {
      resolvePendingPush = resolve
    })
    mutationMock.mockReset().mockReturnValue(pendingPush)
    const localOnly = taskMock({ id: 'local-only', syncedAt: '2025-01-01T00:00:00.000Z' })
    useAppStore.getState().loadData({ ...defaultAppData, tasks: [localOnly] })
    useAppStore.getState().setSyncUrl('https://sync.convex.cloud')
    const { rerender } = renderHook(() => useSync())
    // the push starts (mutation called) but is deliberately left unresolved, simulating a toggle-off
    // while the write is still in flight
    await waitFor(() => expect(mutationMock).toHaveBeenCalledOnce())
    useAppStore.getState().setSyncUrl('')
    rerender()
    expect(closeMock).toHaveBeenCalledOnce()
    // the in-flight write completing after teardown must not throw
    // oxlint-disable-next-line unicorn/no-null -- mirrors the real upsertTask mutation's v.null() return validator
    expect(() => resolvePendingPush(null)).not.toThrow()
    await Promise.resolve()
    // no new push is issued once sync is off, even though the store still has this task
    expect(mutationMock).toHaveBeenCalledOnce()
  })

  it('K tears down the client (closes and unsubscribes) when syncUrl is cleared, and goes back off', async () => {
    const fakeWatch = createFakeWatch()
    watchQueryMock.mockReturnValue(fakeWatch.watch)
    useAppStore.getState().loadData(defaultAppData)
    useAppStore.getState().setSyncUrl('https://sync.convex.cloud')
    const { rerender, result } = renderHook(() => useSync())
    await waitFor(() => expect(constructMock).toHaveBeenCalledOnce())
    useAppStore.getState().setSyncUrl('')
    rerender()
    expect(closeMock).toHaveBeenCalledOnce()
    expect(result.current).toBe('off')
  })

  it('L tears down the client on unmount', async () => {
    const fakeWatch = createFakeWatch()
    watchQueryMock.mockReturnValue(fakeWatch.watch)
    useAppStore.getState().loadData(defaultAppData)
    useAppStore.getState().setSyncUrl('https://sync.convex.cloud')
    const { unmount } = renderHook(() => useSync())
    unmount()
    // the client is constructed asynchronously (dynamic `import('convex/react')`), so unmounting
    // right away races that import ; either the effect cleanup disposes an already-started session,
    // or the pending construction notices `isCancelled` and closes the client itself once it resolves
    await waitFor(() => expect(closeMock).toHaveBeenCalledOnce())
  })
})
