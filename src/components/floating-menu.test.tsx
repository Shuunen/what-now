import { act, fireEvent, render } from '@testing-library/react'
import { FloatingMenu } from './floating-menu'

function setFullscreenElement(value: Element | undefined) {
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, value })
}

function openMenu() {
  const view = render(<FloatingMenu actions={[]} />)
  fireEvent.click(view.getByTestId('floating-menu-trigger'))
  return view
}

describe('FloatingMenu fullscreen item', () => {
  const requestFullscreen = vi.fn<() => Promise<void>>()

  beforeEach(() => {
    requestFullscreen.mockReset().mockResolvedValue(undefined)
    document.documentElement.requestFullscreen = requestFullscreen
    Object.assign(document, { exitFullscreen: vi.fn<() => Promise<void>>().mockResolvedValue(undefined) })
    setFullscreenElement(undefined)
  })

  it('A offers fullscreen, with the icon matching the state of the page', () => {
    const { getByTestId } = openMenu()
    expect(getByTestId('menu-item-fullscreen')).toContainHTML('lucide-maximize')
    act(() => {
      setFullscreenElement(document.body)
      document.dispatchEvent(new Event('fullscreenchange'))
    })
    expect(getByTestId('menu-item-fullscreen')).toContainHTML('lucide-minimize')
  })

  it('B goes fullscreen and closes the menu when chosen', () => {
    const { getByTestId, queryByTestId } = openMenu()
    fireEvent.click(getByTestId('menu-item-fullscreen'))
    expect(requestFullscreen).toHaveBeenCalledOnce()
    expect(queryByTestId('menu-item-fullscreen')).toBeNull()
  })

  it('C is disabled when the browser has no fullscreen support', () => {
    Object.assign(document.documentElement, { requestFullscreen: undefined })
    const { getByTestId } = openMenu()
    expect(getByTestId('menu-item-fullscreen')).toHaveAttribute('data-disabled', 'true')
  })
})
