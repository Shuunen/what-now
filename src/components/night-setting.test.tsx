import { fireEvent, render } from '@testing-library/react'
import { defaultAppData } from '../schemas/app-data'
import { useAppStore } from '../store/use-app-store'
import { NightSetting } from './night-setting'

describe('NightSetting', () => {
  beforeEach(() => {
    useAppStore.setState({ data: defaultAppData, isLoading: false })
  })

  it('A starts from the saved night and saves a valid start and end', () => {
    const { getByTestId } = render(<NightSetting />)
    const start = getByTestId('input-night-start') as HTMLInputElement
    const end = getByTestId('input-night-end') as HTMLInputElement
    expect(start.value).toBe('00:00')
    expect(end.value).toBe('07:00')
    fireEvent.change(start, { target: { value: '23:30' } })
    fireEvent.change(end, { target: { value: '06:30' } })
    expect(useAppStore.getState().data.settings.nightStart).toBe('23:30')
    expect(useAppStore.getState().data.settings.nightEnd).toBe('06:30')
  })

  it('B keeps the saved night while the typed time is not complete, and restores it on blur', () => {
    const { getByTestId } = render(<NightSetting />)
    const start = getByTestId('input-night-start') as HTMLInputElement
    const end = getByTestId('input-night-end') as HTMLInputElement
    fireEvent.change(start, { target: { value: '' } })
    fireEvent.change(end, { target: { value: '' } })
    expect(useAppStore.getState().data.settings.nightStart).toBe('00:00')
    expect(useAppStore.getState().data.settings.nightEnd).toBe('07:00')
    fireEvent.blur(start)
    fireEvent.blur(end)
    expect(start.value).toBe('00:00')
    expect(end.value).toBe('07:00')
  })

  it('C is disabled while the stored data is loading', () => {
    useAppStore.setState({ isLoading: true })
    const { getByTestId } = render(<NightSetting />)
    expect(getByTestId('input-night-start')).toBeDisabled()
    expect(getByTestId('input-night-end')).toBeDisabled()
  })
})
