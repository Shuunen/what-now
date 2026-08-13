import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { defaultAppData } from '../schemas/app-data'
import { useAppStore } from '../store/use-app-store'
import { useCoachSetting } from './pages.utils'

describe('pages.utils useCoachSetting', () => {
  beforeEach(() => {
    useAppStore.setState({ data: defaultAppData })
  })

  it('A reflects "disabled" when the coach is turned off', () => {
    useAppStore.getState().setCoachEnabled(false)
    const { result } = renderHook(() => useCoachSetting())
    expect(result.current.value).toBe('disabled')
  })

  it('B reflects the coach language when the coach is turned on', () => {
    useAppStore.getState().setCoachEnabled(true)
    useAppStore.getState().setCoachLanguage('fr')
    const { result } = renderHook(() => useCoachSetting())
    expect(result.current.value).toBe('fr')
  })

  it('C setting "disabled" turns the coach off without touching its language', () => {
    useAppStore.getState().setCoachEnabled(true)
    useAppStore.getState().setCoachLanguage('fr')
    const { result } = renderHook(() => useCoachSetting())
    act(() => {
      result.current.setValue('disabled')
    })
    expect(useAppStore.getState().data.settings.coachEnabled).toBe(false)
    expect(useAppStore.getState().data.settings.coachLanguage).toBe('fr')
  })

  it('D setting a language turns the coach on and updates the language', () => {
    useAppStore.getState().setCoachEnabled(false)
    const { result } = renderHook(() => useCoachSetting())
    act(() => {
      result.current.setValue('en')
    })
    expect(useAppStore.getState().data.settings.coachEnabled).toBe(true)
    expect(useAppStore.getState().data.settings.coachLanguage).toBe('en')
  })
})
