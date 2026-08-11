import { renderHook } from '@testing-library/react'
import { CalendarIcon, CircleQuestionMarkIcon, HomeIcon, MicIcon, MicOffIcon, SettingsIcon } from 'lucide-react'
import { defaultAppData } from '../schemas/app-data'
import { useAppStore } from '../store/use-app-store'
import { useActions } from './pages.utils'

// Mock react-router-dom
const mockNavigate = vi.fn<() => void>()
vi.mock(import('react-router-dom'), () => ({
  useNavigate: () => mockNavigate,
}))

// Mock globalThis.location
Object.defineProperty(globalThis, 'location', {
  value: {
    pathname: '/',
  },
  writable: true,
})

describe('useActions', () => {
  beforeEach(() => {
    useAppStore.setState({ data: defaultAppData })
  })

  it('A should return correct actions with home page as current', () => {
    globalThis.location.pathname = '/'
    const { result: actions } = renderHook(() => useActions())
    expect(actions.current).toStrictEqual([
      { disabled: true, handleClick: expect.any(Function), icon: HomeIcon, name: 'Tasks' }, // Current path is '/'
      { disabled: false, handleClick: expect.any(Function), icon: CalendarIcon, name: 'Planner' },
      { dimmed: false, handleClick: expect.any(Function), icon: MicIcon, name: 'Coach' },
      { disabled: false, handleClick: expect.any(Function), icon: SettingsIcon, name: 'Settings' },
      { disabled: false, handleClick: expect.any(Function), icon: CircleQuestionMarkIcon, name: 'About' },
    ])
  })

  it('B should return correct actions with settings page as current', () => {
    globalThis.location.pathname = '/settings'
    const { result: actions } = renderHook(() => useActions())
    expect(actions.current).toHaveLength(5)
    expect(actions.current[0]).toStrictEqual({
      disabled: false,
      handleClick: expect.any(Function),
      icon: HomeIcon,
      name: 'Tasks',
    })
    expect(actions.current[1]).toStrictEqual({
      disabled: false,
      handleClick: expect.any(Function),
      icon: CalendarIcon,
      name: 'Planner',
    })
    expect(actions.current[3]).toStrictEqual({
      disabled: true, // Current path is '/settings'
      handleClick: expect.any(Function),
      icon: SettingsIcon,
      name: 'Settings',
    })
    expect(actions.current[4]).toStrictEqual({
      disabled: false,
      handleClick: expect.any(Function),
      icon: CircleQuestionMarkIcon,
      name: 'About',
    })
  })

  it('C should return correct actions with planner page as current', () => {
    globalThis.location.pathname = '/planner'
    const { result: actions } = renderHook(() => useActions())
    expect(actions.current).toHaveLength(5)
    expect(actions.current[0]).toStrictEqual({
      disabled: false,
      handleClick: expect.any(Function),
      icon: HomeIcon,
      name: 'Tasks',
    })
    expect(actions.current[1]).toStrictEqual({
      disabled: true, // Current path is '/planner'
      handleClick: expect.any(Function),
      icon: CalendarIcon,
      name: 'Planner',
    })
    expect(actions.current[3]).toStrictEqual({
      disabled: false,
      handleClick: expect.any(Function),
      icon: SettingsIcon,
      name: 'Settings',
    })
    expect(actions.current[4]).toStrictEqual({
      disabled: false,
      handleClick: expect.any(Function),
      icon: CircleQuestionMarkIcon,
      name: 'About',
    })
  })

  it('D should return correct actions with about page as current', () => {
    globalThis.location.pathname = '/about'
    const { result: actions } = renderHook(() => useActions())
    expect(actions.current).toHaveLength(5)
    expect(actions.current[0]).toStrictEqual({
      disabled: false,
      handleClick: expect.any(Function),
      icon: HomeIcon,
      name: 'Tasks',
    })
    expect(actions.current[1]).toStrictEqual({
      disabled: false,
      handleClick: expect.any(Function),
      icon: CalendarIcon,
      name: 'Planner',
    })
    expect(actions.current[3]).toStrictEqual({
      disabled: false,
      handleClick: expect.any(Function),
      icon: SettingsIcon,
      name: 'Settings',
    })
    expect(actions.current[4]).toStrictEqual({
      disabled: true, // Current path is '/about'
      handleClick: expect.any(Function),
      icon: CircleQuestionMarkIcon,
      name: 'About',
    })
  })

  it('E should call navigate with correct path when home action is clicked', () => {
    globalThis.location.pathname = '/settings'
    mockNavigate.mockClear()
    const { result: actions } = renderHook(() => useActions())
    const homeAction = actions.current.at(0)
    homeAction?.handleClick()
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('F should call navigate with correct path when settings action is clicked', () => {
    globalThis.location.pathname = '/'
    mockNavigate.mockClear()
    const { result: actions } = renderHook(() => useActions())
    const settingsAction = actions.current.at(3)
    settingsAction?.handleClick()
    expect(mockNavigate).toHaveBeenCalledWith('/settings')
  })

  it('G should call navigate with correct path when about action is clicked', () => {
    globalThis.location.pathname = '/'
    mockNavigate.mockClear()
    const { result: actions } = renderHook(() => useActions())
    const aboutAction = actions.current.at(4)
    aboutAction?.handleClick()
    expect(mockNavigate).toHaveBeenCalledWith('/about')
  })

  it('H should call navigate with correct path when planner action is clicked', () => {
    globalThis.location.pathname = '/'
    mockNavigate.mockClear()
    const { result: actions } = renderHook(() => useActions())
    const plannerAction = actions.current.at(1)
    plannerAction?.handleClick()
    expect(mockNavigate).toHaveBeenCalledWith('/planner')
  })

  it('I coach action reflects the current coachEnabled setting and toggles it on click', () => {
    globalThis.location.pathname = '/'
    const { rerender, result: actions } = renderHook(() => useActions())
    const coachAction = actions.current.at(2)
    expect(coachAction).toStrictEqual({ dimmed: false, handleClick: expect.any(Function), icon: MicIcon, name: 'Coach' })
    coachAction?.handleClick()
    expect(useAppStore.getState().data.settings.coachEnabled).toBe(false)
    rerender()
    expect(actions.current.at(2)).toStrictEqual({ dimmed: true, handleClick: expect.any(Function), icon: MicOffIcon, name: 'Coach' })
  })
})
