import { useState } from 'react'
import { Credentials } from '../components/credentials'
import { FloatingMenu } from '../components/floating-menu'
import { Status } from '../components/status'
import { useActions } from '../utils/pages.utils'
import { state, watchState } from '../utils/state.utils'

export function PageSettings() {
  const [error, setError] = useState(state.statusError)
  const actions = useActions()
  watchState('statusError', () => setError(state.statusError))
  return (
    <div className="flex grow flex-col items-center justify-center" data-testid="page-settings">
      <h1>Settings</h1>
      <Status error={error} />
      <Credentials />
      <FloatingMenu actions={actions} />
    </div>
  )
}
