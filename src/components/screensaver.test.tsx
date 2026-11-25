import { act, fireEvent, render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { defaultAppData } from '../schemas/app-data'
import { useAppStore } from '../store/use-app-store'
import { taskMock } from '../utils/tasks.utils'
import { Screensaver } from './screensaver'

const idleSeconds = 10

function renderScreensaver() {
  return render(
    <MemoryRouter>
      <Screensaver />
    </MemoryRouter>,
  )
}

function loadTasks(tasks: ReturnType<typeof taskMock>[]) {
  useAppStore.getState().loadData({ settings: { ...defaultAppData.settings, screensaverIdleSeconds: idleSeconds }, tasks })
}

describe('Screensaver', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useAppStore.setState({ data: defaultAppData, isLoading: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('A shows nothing while the user is active, then the remaining count once idle', () => {
    loadTasks([taskMock({ completedOn: '', id: 'a' }), taskMock({ completedOn: '', id: 'b' })])
    const { getByTestId, queryByTestId } = renderScreensaver()
    expect(queryByTestId('screensaver')).toBeNull()
    act(() => vi.advanceTimersByTime(idleSeconds * 1000))
    expect(getByTestId('screensaver')).toBeDefined()
    expect(getByTestId('screensaver-count')).toHaveTextContent('2')
    expect(queryByTestId('screensaver-clock')).toBeNull()
  })

  it('B restarts the delay on every touch', () => {
    loadTasks([taskMock({ completedOn: '', id: 'a' })])
    const { queryByTestId } = renderScreensaver()
    act(() => vi.advanceTimersByTime(idleSeconds * 800))
    fireEvent.pointerDown(globalThis.window)
    act(() => vi.advanceTimersByTime(idleSeconds * 800))
    expect(queryByTestId('screensaver')).toBeNull()
    act(() => vi.advanceTimersByTime(idleSeconds * 400))
    expect(queryByTestId('screensaver')).not.toBeNull()
  })

  it('C shows the clock once every task is done', () => {
    loadTasks([taskMock({ id: 'a', once: 'week' })])
    const { getByTestId, queryByTestId } = renderScreensaver()
    act(() => vi.advanceTimersByTime(idleSeconds * 1000))
    expect(getByTestId('screensaver-clock')).toBeDefined()
    expect(getByTestId('screensaver-clock-time').textContent).toMatch(/^\d{2}.\d{2}$/u)
    expect(queryByTestId('screensaver-count')).toBeNull()
  })

  it('D shows in portrait too', () => {
    loadTasks([taskMock({ completedOn: '', id: 'a' })])
    const { getByTestId } = renderScreensaver()
    act(() => vi.advanceTimersByTime(idleSeconds * 1000))
    expect(getByTestId('screensaver')).toBeDefined()
  })

  it('E goes away on touch', () => {
    loadTasks([taskMock({ completedOn: '', id: 'a' })])
    const { getByTestId, queryByTestId } = renderScreensaver()
    act(() => vi.advanceTimersByTime(idleSeconds * 1000))
    fireEvent.click(getByTestId('screensaver'))
    expect(queryByTestId('screensaver')).toBeNull()
  })

  it('F waits for the stored data before counting down', () => {
    const { queryByTestId } = renderScreensaver()
    act(() => vi.advanceTimersByTime(idleSeconds * 5000))
    expect(queryByTestId('screensaver')).toBeNull()
  })
})
