import { act, render } from '@testing-library/react'
import { useBounce } from './use-bounce'

type FrameCallback = (time: number) => void

function Harness({ onHit }: { onHit: () => void }) {
  const { containerRef, itemRef } = useBounce(onHit)
  return (
    <div data-testid="container" ref={containerRef}>
      <div data-testid="item" ref={itemRef} />
    </div>
  )
}

describe('useBounce', () => {
  let frames: FrameCallback[] = []

  beforeEach(() => {
    frames = []
    vi.stubGlobal('requestAnimationFrame', (frame: FrameCallback) => frames.push(frame))
    vi.stubGlobal('cancelAnimationFrame', vi.fn<() => void>())
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(500)
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(100)
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(50)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  function runFrames(count: number) {
    const start = globalThis.performance.now()
    act(() => {
      for (let index = 1; index <= count; index += 1) frames.shift()?.(start + index * 100)
    })
  }

  it('A moves the item and reports each wall it hits', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const onHit = vi.fn<() => void>()
    const { getByTestId } = render(<Harness onHit={onHit} />)
    expect(getByTestId('item').style.transform).toBe('translate3d(100px, 50px, 0)')
    runFrames(1)
    expect(getByTestId('item').style.transform).not.toBe('translate3d(100px, 50px, 0)')
    expect(onHit).not.toHaveBeenCalled()
    runFrames(150)
    expect(onHit).toHaveBeenCalled()
  })

  it('B keeps the item still with reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    const { getByTestId } = render(<Harness onHit={vi.fn<() => void>()} />)
    expect(getByTestId('item').style.transform).toBe('translate3d(100px, 50px, 0)')
    expect(frames).toHaveLength(0)
  })

  it('C stops asking for frames once unmounted', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const { unmount } = render(<Harness onHit={vi.fn<() => void>()} />)
    unmount()
    expect(globalThis.cancelAnimationFrame).toHaveBeenCalledOnce()
  })
})
