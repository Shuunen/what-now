import { renderHook, waitFor } from '@testing-library/react'
import { defaultAppData } from '../schemas/app-data'
import { useAppStore } from '../store/use-app-store'
import { useToastStore } from '../store/use-toast-store'
import { logger } from '../utils/logger.utils'
import { appDataId, db } from './db'
import { useHydration, usePersistence } from './use-persistence'

describe('useHydration & usePersistence', () => {
  beforeEach(() => {
    useAppStore.setState({ data: defaultAppData, isLoading: true })
    useToastStore.setState({ toasts: [] })
  })

  it('A useHydration loads existing data from IndexedDB', async () => {
    const data = { ...defaultAppData, settings: { ...defaultAppData.settings, userName: 'Alice' } }
    await db.appdata.put({ data, id: appDataId })
    renderHook(() => useHydration())
    await waitFor(() => expect(useAppStore.getState().isLoading).toBe(false))
    expect(useAppStore.getState().data.settings.userName).toBe('Alice')
  })

  it('A2 useHydration recovers valid tasks when one stored task fails validation', async () => {
    const data = {
      settings: defaultAppData.settings,
      tasks: [
        { id: 'a', minutes: -5, name: 'corrupt' },
        { id: 'b', name: 'fine' },
      ],
    }
    await db.appdata.put({ data: data as unknown as typeof defaultAppData, id: appDataId })
    renderHook(() => useHydration())
    await waitFor(() => expect(useAppStore.getState().isLoading).toBe(false))
    expect(useAppStore.getState().data.tasks).toHaveLength(1)
    expect(useAppStore.getState().data.tasks[0]?.id).toBe('b')
  })

  it('B useHydration falls back to default data and warns the user when IndexedDB read fails', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockReturnValue(undefined)
    vi.spyOn(db.appdata, 'get').mockRejectedValueOnce(new Error('read failed'))
    renderHook(() => useHydration())
    await waitFor(() => expect(useAppStore.getState().isLoading).toBe(false))
    expect(useAppStore.getState().data).toStrictEqual(defaultAppData)
    expect(errorSpy).toHaveBeenCalledWith('failed to hydrate from IndexedDB', expect.any(Error))
    await waitFor(() => expect(useToastStore.getState().toasts).toHaveLength(1))
  })

  it('C usePersistence writes store changes to IndexedDB', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    renderHook(() => usePersistence())
    useAppStore.getState().setUserName('Bob')
    await vi.runAllTimersAsync()
    const record = await db.appdata.get(appDataId)
    expect(record?.data.settings.userName).toBe('Bob')
    vi.useRealTimers()
  })

  it('D usePersistence logs, warns the user once, and does not throw when IndexedDB write fails', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockReturnValue(undefined)
    vi.spyOn(db.appdata, 'put').mockRejectedValue(new Error('write failed'))
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    renderHook(() => usePersistence())
    useAppStore.getState().setUserName('Carl')
    await vi.runAllTimersAsync()
    useAppStore.getState().setUserName('Dana')
    await vi.runAllTimersAsync()
    expect(errorSpy).toHaveBeenCalledWith('failed to persist to IndexedDB', expect.any(Error))
    vi.useRealTimers()
    await waitFor(() => expect(useToastStore.getState().toasts).toHaveLength(1))
  })
})
