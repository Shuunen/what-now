import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { defaultAppData } from '../schemas/app-data'
import { useAppStore } from '../store/use-app-store'
import { taskMock } from '../utils/tasks.utils'
import { PageTasks } from './page-tasks'

function renderPage(isLandscape: boolean) {
  vi.stubGlobal('matchMedia', () => ({ addEventListener: vi.fn<() => void>(), matches: isLandscape, removeEventListener: vi.fn<() => void>() }))
  return render(
    <MemoryRouter>
      <PageTasks />
    </MemoryRouter>,
  )
}

describe('PageTasks layout', () => {
  beforeEach(() => {
    useAppStore.getState().loadData({ ...defaultAppData, tasks: [taskMock({ completedOn: '', id: 'a' }), taskMock({ completedOn: '', id: 'b' })] })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('A lists the tasks in two columns on a landscape screen', () => {
    const { getByTestId } = renderPage(true)
    expect(getByTestId('tasks')).toHaveClass('grid-cols-2')
  })

  it('B lists the tasks in one column on a portrait screen', () => {
    const { getByTestId } = renderPage(false)
    expect(getByTestId('tasks')).toHaveClass('grid-cols-1')
  })
})
