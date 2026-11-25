import { act, render } from '@testing-library/react'
import { createRef } from 'react'
import { ScreensaverCountdown } from './screensaver-countdown'

let hit: () => void = () => undefined

vi.mock(import('../hooks/use-bounce'), () => ({
  useBounce: (onHit: () => void) => {
    hit = onHit
    return { containerRef: createRef<HTMLDivElement>(), itemRef: createRef<HTMLDivElement>() }
  },
}))

// happy-dom drops oklch colors, so the shift is turned into a plain rgb color to read the hue offset the logo uses
vi.mock(import('../utils/screensaver.utils'), async importOriginal => ({ ...(await importOriginal()), shiftHue: (_hue: number, degrees: number) => `rgb(${degrees + 100}, 0, 0)` }))

describe('ScreensaverCountdown', () => {
  it('A shows the remaining count', () => {
    const { getByTestId } = render(<ScreensaverCountdown percent={0} remaining={7} />)
    expect(getByTestId('screensaver-count')).toHaveTextContent('7')
  })

  it('B shifts the logo hue on each wall hit', () => {
    const { getByTestId } = render(<ScreensaverCountdown percent={0} remaining={7} />)
    const readBadge = () => getByTestId('screensaver-badge').getAttribute('style')
    expect(readBadge()).toContain('rgb(100, 0, 0)')
    act(() => hit())
    expect(readBadge()).toContain('rgb(110, 0, 0)')
    act(() => hit())
    expect(readBadge()).toContain('rgb(90, 0, 0)')
  })

  it('C starts over with the first shade after the last one', () => {
    const { getByTestId } = render(<ScreensaverCountdown percent={0} remaining={7} />)
    const readBadge = () => getByTestId('screensaver-badge').getAttribute('style')
    act(() => {
      for (let index = 0; index < 4; index += 1) hit()
    })
    expect(readBadge()).toContain('rgb(80, 0, 0)')
    act(() => hit())
    expect(readBadge()).toContain('rgb(100, 0, 0)')
  })
})
