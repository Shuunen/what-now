import { act, renderHook } from '@testing-library/react'
import { useOfflineStatus } from './offline.utils'

describe('useOfflineStatus', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('A reflects navigator.onLine on mount', () => {
    vi.spyOn(globalThis.navigator, 'onLine', 'get').mockReturnValue(false)
    const { result } = renderHook(() => useOfflineStatus())
    expect(result.current).toBe(true)
  })

  it('B flips to true on an offline event and back to false on an online event', () => {
    vi.spyOn(globalThis.navigator, 'onLine', 'get').mockReturnValue(true)
    const { result } = renderHook(() => useOfflineStatus())
    act(() => globalThis.dispatchEvent(new Event('online')))
    expect(result.current).toBe(false)
    act(() => globalThis.dispatchEvent(new Event('offline')))
    expect(result.current).toBe(true)
    act(() => globalThis.dispatchEvent(new Event('online')))
    expect(result.current).toBe(false)
  })

  it('C removes its event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(globalThis, 'removeEventListener')
    const { unmount } = renderHook(() => useOfflineStatus())
    unmount()
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
  })
})
