import { renderHook } from '@testing-library/react'
import { useAutoFullscreen } from './use-auto-fullscreen'

function mockDevice(isTouch: boolean, requestFullscreen = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)) {
  vi.stubGlobal('matchMedia', () => ({ matches: isTouch }))
  document.documentElement.requestFullscreen = requestFullscreen
  return requestFullscreen
}

describe('useAutoFullscreen', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('A goes fullscreen on the first click on a touch device, and only once', () => {
    const requestFullscreen = mockDevice(true)
    renderHook(() => useAutoFullscreen())
    expect(requestFullscreen).not.toHaveBeenCalled()
    globalThis.dispatchEvent(new Event('click'))
    globalThis.dispatchEvent(new Event('click'))
    expect(requestFullscreen).toHaveBeenCalledOnce()
  })

  it('B never goes fullscreen with a mouse', () => {
    const requestFullscreen = mockDevice(false)
    renderHook(() => useAutoFullscreen())
    globalThis.dispatchEvent(new Event('click'))
    expect(requestFullscreen).not.toHaveBeenCalled()
  })

  it('C does nothing when the browser has no fullscreen support', () => {
    mockDevice(true)
    Object.assign(document.documentElement, { requestFullscreen: undefined })
    expect(() => {
      renderHook(() => useAutoFullscreen())
      globalThis.dispatchEvent(new Event('click'))
    }).not.toThrow()
  })

  it('D does nothing when already fullscreen, and survives a refusal', async () => {
    const refusing = mockDevice(true, vi.fn<() => Promise<void>>().mockRejectedValue(new Error('denied')))
    renderHook(() => useAutoFullscreen())
    globalThis.dispatchEvent(new Event('click'))
    await Promise.resolve()
    expect(refusing).toHaveBeenCalledOnce()
    const already = mockDevice(true)
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: document.body })
    renderHook(() => useAutoFullscreen())
    globalThis.dispatchEvent(new Event('click'))
    expect(already).not.toHaveBeenCalled()
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: undefined })
  })

  it('E stops listening once unmounted', () => {
    const requestFullscreen = mockDevice(true)
    const { unmount } = renderHook(() => useAutoFullscreen())
    unmount()
    globalThis.dispatchEvent(new Event('click'))
    expect(requestFullscreen).not.toHaveBeenCalled()
  })
})
