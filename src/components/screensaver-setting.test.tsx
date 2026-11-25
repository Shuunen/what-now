import { fireEvent, render } from '@testing-library/react'
import { defaultAppData } from '../schemas/app-data'
import { useAppStore } from '../store/use-app-store'
import { ScreensaverSetting } from './screensaver-setting'

describe('ScreensaverSetting', () => {
  beforeEach(() => {
    useAppStore.setState({ data: defaultAppData, isLoading: false })
  })

  it('A only saves a valid delay and restores the saved one on blur', () => {
    const { getByTestId } = render(<ScreensaverSetting />)
    const input = getByTestId('input-screensaver-delay') as HTMLInputElement
    expect(input.value).toBe('60')
    fireEvent.change(input, { target: { value: '120' } })
    expect(useAppStore.getState().data.settings.screensaverIdleSeconds).toBe(120)
    fireEvent.change(input, { target: { value: '1' } })
    expect(useAppStore.getState().data.settings.screensaverIdleSeconds).toBe(120)
    fireEvent.change(input, { target: { value: '' } })
    expect(useAppStore.getState().data.settings.screensaverIdleSeconds).toBe(120)
    fireEvent.blur(input)
    expect(input.value).toBe('120')
  })

  it('B is disabled while the stored data is loading', () => {
    useAppStore.setState({ isLoading: true })
    const { getByTestId } = render(<ScreensaverSetting />)
    expect(getByTestId('input-screensaver-delay')).toBeDisabled()
  })
})
