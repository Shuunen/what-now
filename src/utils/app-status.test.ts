import { renderHook } from '@testing-library/react'
import { defaultAppData } from '../schemas/app-data'
import { useAppStore } from '../store/use-app-store'
import { useAppStatus } from './app-status.utils'

describe('useAppStatus', () => {
  beforeEach(() => {
    useAppStore.setState({ data: defaultAppData, isOffline: false, status: '', syncStatus: 'off' })
  })

  it('A publishes the page text when there is no connectivity note', () => {
    renderHook(() => useAppStatus('Nothing done... yet'))
    expect(useAppStore.getState().status).toBe('Nothing done... yet')
  })

  it('B publishes an empty status when called without page text', () => {
    renderHook(() => useAppStatus())
    expect(useAppStore.getState().status).toBe('')
  })

  it('C the offline note takes priority over the page text', () => {
    useAppStore.getState().setOffline(true)
    renderHook(() => useAppStatus('Nothing done... yet'))
    expect(useAppStore.getState().status).toBe("You're offline, changes are saved on this device")
  })

  it('D the offline note mentions sync resuming when a sync url is configured', () => {
    useAppStore.getState().setOffline(true)
    useAppStore.getState().setSyncUrl('https://sync.convex.cloud')
    renderHook(() => useAppStatus())
    expect(useAppStore.getState().status).toBe("You're offline, changes are saved on this device — sync will resume when back online")
  })

  it('E a noteworthy sync status takes priority over the page text while online', () => {
    useAppStore.getState().setSyncUrl('https://sync.convex.cloud')
    useAppStore.getState().setSyncStatus('syncing')
    renderHook(() => useAppStatus('Nothing done... yet'))
    expect(useAppStore.getState().status).toBe('Syncing…')
  })

  it('F the common synced state stays silent, falling back to the page text', () => {
    useAppStore.getState().setSyncUrl('https://sync.convex.cloud')
    useAppStore.getState().setSyncStatus('synced')
    renderHook(() => useAppStatus('Nothing done... yet'))
    expect(useAppStore.getState().status).toBe('Nothing done... yet')
  })

  it('G clears the status on unmount', () => {
    const { unmount } = renderHook(() => useAppStatus('Nothing done... yet'))
    expect(useAppStore.getState().status).toBe('Nothing done... yet')
    unmount()
    expect(useAppStore.getState().status).toBe('')
  })
})
