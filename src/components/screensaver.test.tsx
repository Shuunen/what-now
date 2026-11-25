import { act, fireEvent, render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { defaultAppData } from '../schemas/app-data'
import { useAppStore } from '../store/use-app-store'
import { taskMock } from '../utils/tasks.utils'
import { Screensaver } from './screensaver'

const idleSeconds = 10

const mockNavigate = vi.fn<() => void>()
vi.mock(import('react-router-dom'), async importOriginal => ({ ...(await importOriginal()), useNavigate: () => mockNavigate }))

function renderScreensaver(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
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
    mockNavigate.mockClear()
    vi.setSystemTime(new Date(2026, 10, 25, 12, 0, 0))
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

  it('G shows the clock all night even when tasks are left, then the count again once the night ends', () => {
    vi.setSystemTime(new Date(2026, 10, 25, 6, 59, 0))
    loadTasks([taskMock({ completedOn: '', id: 'a' })])
    const { getByTestId, queryByTestId } = renderScreensaver()
    act(() => vi.advanceTimersByTime(idleSeconds * 1000))
    expect(getByTestId('screensaver-clock')).toBeDefined()
    expect(queryByTestId('screensaver-count')).toBeNull()
    act(() => vi.advanceTimersByTime(60 * 1000))
    expect(getByTestId('screensaver-count')).toHaveTextContent('1')
    expect(queryByTestId('screensaver-clock')).toBeNull()
  })

  it('H shows the count during the day', () => {
    vi.setSystemTime(new Date(2026, 10, 25, 12, 0, 0))
    loadTasks([taskMock({ completedOn: '', id: 'a' })])
    const { getByTestId } = renderScreensaver()
    act(() => vi.advanceTimersByTime(idleSeconds * 1000))
    expect(getByTestId('screensaver-count')).toHaveTextContent('1')
  })

  it('I a tap goes back to the tasks list, except on the add task form', () => {
    loadTasks([taskMock({ completedOn: '', id: 'a' })])
    const first = renderScreensaver('/settings')
    act(() => vi.advanceTimersByTime(idleSeconds * 1000))
    fireEvent.click(first.getByTestId('screensaver'))
    expect(mockNavigate).toHaveBeenCalledWith('/')
    first.unmount()
    mockNavigate.mockClear()
    const second = renderScreensaver('/add-task')
    act(() => vi.advanceTimersByTime(idleSeconds * 1000))
    fireEvent.click(second.getByTestId('screensaver'))
    expect(mockNavigate).not.toHaveBeenCalled()
    expect(second.queryByTestId('screensaver')).toBeNull()
  })

  it('J a key press wakes the screensaver without changing page', () => {
    loadTasks([taskMock({ completedOn: '', id: 'a' })])
    const { queryByTestId } = renderScreensaver('/settings')
    act(() => vi.advanceTimersByTime(idleSeconds * 1000))
    expect(queryByTestId('screensaver')).not.toBeNull()
    fireEvent.keyDown(globalThis.window, { key: 'Enter' })
    expect(queryByTestId('screensaver')).toBeNull()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('K takes the focus off the element hidden under the screensaver', () => {
    loadTasks([taskMock({ completedOn: '', id: 'a' })])
    const input = document.createElement('input')
    document.body.append(input)
    input.focus()
    renderScreensaver()
    act(() => vi.advanceTimersByTime(idleSeconds * 1000))
    expect(document.activeElement).not.toBe(input)
    input.remove()
  })
})
