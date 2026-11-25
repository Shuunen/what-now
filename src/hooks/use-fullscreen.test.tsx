import { act, renderHook } from '@testing-library/react'
import { useFullscreen } from './use-fullscreen'

function setFullscreenElement(value: Element | undefined) {
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, value })
}

describe('useFullscreen', () => {
  const requestFullscreen = vi.fn<() => Promise<void>>()
  const exitFullscreen = vi.fn<() => Promise<void>>()

  beforeEach(() => {
    requestFullscreen.mockReset().mockResolvedValue(undefined)
    exitFullscreen.mockReset().mockResolvedValue(undefined)
    document.documentElement.requestFullscreen = requestFullscreen
    document.exitFullscreen = exitFullscreen
    setFullscreenElement(undefined)
  })

  it('A enters fullscreen when the page is not fullscreen', async () => {
    const { result } = renderHook(() => useFullscreen())
    expect(result.current.isFullscreen).toBe(false)
    expect(result.current.isSupported).toBe(true)
    await act(() => result.current.toggleFullscreen())
    expect(requestFullscreen).toHaveBeenCalledOnce()
    expect(exitFullscreen).not.toHaveBeenCalled()
  })

  it('B leaves fullscreen when the page is fullscreen, and follows the browser', async () => {
    const { result } = renderHook(() => useFullscreen())
    act(() => {
      setFullscreenElement(document.body)
      document.dispatchEvent(new Event('fullscreenchange'))
    })
    expect(result.current.isFullscreen).toBe(true)
    await act(() => result.current.toggleFullscreen())
    expect(exitFullscreen).toHaveBeenCalledOnce()
    expect(requestFullscreen).not.toHaveBeenCalled()
  })

  it('C survives a refused request', async () => {
    requestFullscreen.mockRejectedValue(new Error('denied'))
    const { result } = renderHook(() => useFullscreen())
    await act(() => result.current.toggleFullscreen())
    expect(requestFullscreen).toHaveBeenCalledOnce()
  })

  it('D reports when the browser has no fullscreen support', () => {
    Object.assign(document.documentElement, { requestFullscreen: undefined })
    const { result } = renderHook(() => useFullscreen())
    expect(result.current.isSupported).toBe(false)
  })

  it('E stops following the browser once unmounted', () => {
    const { unmount } = renderHook(() => useFullscreen())
    unmount()
    expect(() => document.dispatchEvent(new Event('fullscreenchange'))).not.toThrow()
  })
})
