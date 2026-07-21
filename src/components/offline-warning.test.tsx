import { render } from '@testing-library/react'
import { defaultAppData } from '../schemas/app-data'
import { useAppStore } from '../store/use-app-store'
import { OfflineWarning } from './offline-warning'

describe('OfflineWarning', () => {
  beforeEach(() => {
    useAppStore.setState({ data: defaultAppData, isLoading: false, syncStatus: 'off' })
  })

  it('A shows the offline warning when offline, regardless of sync status', () => {
    useAppStore.getState().setSyncUrl('https://sync.convex.cloud')
    useAppStore.getState().setSyncStatus('syncing')
    const { getByTestId, queryByTestId } = render(<OfflineWarning isOffline />)
    expect(getByTestId('offline-warning')).toHaveTextContent("You're offline, changes are saved on this device")
    expect(queryByTestId('sync-indicator')).toBeNull()
  })

  it('B renders nothing while online with no sync url configured', () => {
    const { queryByTestId } = render(<OfflineWarning isOffline={false} />)
    expect(queryByTestId('offline-warning')).toBeNull()
    expect(queryByTestId('sync-indicator')).toBeNull()
  })

  it('C renders nothing while online and synced (the common, unremarkable state stays silent)', () => {
    useAppStore.getState().setSyncUrl('https://sync.convex.cloud')
    useAppStore.getState().setSyncStatus('synced')
    const { queryByTestId } = render(<OfflineWarning isOffline={false} />)
    expect(queryByTestId('sync-indicator')).toBeNull()
  })

  const noteworthyLabels = { connecting: 'Connecting to sync…', error: 'Sync error, retrying…', syncing: 'Syncing…' } as const

  it.each(['connecting', 'error', 'syncing'] as const)('D shows the sync indicator with the matching label while online and %s', status => {
    useAppStore.getState().setSyncUrl('https://sync.convex.cloud')
    useAppStore.getState().setSyncStatus(status)
    const { getByTestId } = render(<OfflineWarning isOffline={false} />)
    expect(getByTestId('sync-indicator')).toHaveTextContent(noteworthyLabels[status])
  })

  it('E hides the sync indicator again once the sync url is cleared', () => {
    useAppStore.getState().setSyncUrl('https://sync.convex.cloud')
    useAppStore.getState().setSyncStatus('error')
    useAppStore.getState().setSyncUrl('')
    const { queryByTestId } = render(<OfflineWarning isOffline={false} />)
    expect(queryByTestId('sync-indicator')).toBeNull()
  })
})
