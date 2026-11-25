import { act, renderHook } from '@testing-library/react'
import { useDayKey } from './use-day-key'

describe('useDayKey', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // dateIso10 gives the UTC date, like the rest of the app does for the tasks of the day
    vi.setSystemTime(new Date(Date.UTC(2026, 10, 25, 23, 59, 40)))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('A starts with today and changes when the day changes', () => {
    const { result } = renderHook(() => useDayKey())
    expect(result.current).toBe('2026-11-25')
    act(() => vi.advanceTimersByTime(60_000))
    expect(result.current).toBe('2026-11-26')
  })

  it('B stops refreshing once unmounted', () => {
    const { unmount } = renderHook(() => useDayKey())
    unmount()
    expect(() => vi.advanceTimersByTime(60_000)).not.toThrow()
  })
})
