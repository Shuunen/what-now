import { CoachLanguagePicker } from '../components/coach-language-picker'
import { FloatingMenu } from '../components/floating-menu'
import { ImportExportButtons } from '../components/import-export-buttons'
import { Status } from '../components/status'
import { SyncSetting } from '../components/sync-setting'
import { TextSetting } from '../components/text-setting'
import { useAppStore } from '../store/use-app-store'
import { useAppStatus } from '../utils/app-status.utils'
import { useActions, useCoachSetting } from '../utils/pages.utils'

export function PageSettings() {
  useAppStatus()
  const userName = useAppStore(state => state.data.settings.userName)
  const setUserName = useAppStore(state => state.setUserName)
  const webhook = useAppStore(state => state.data.settings.webhook)
  const setWebhook = useAppStore(state => state.setWebhook)
  const coachSetting = useCoachSetting()
  // disabled while hydrating: an edit made here would otherwise be silently overwritten
  // the moment the pending IndexedDB load resolves and replaces the whole store
  const isLoading = useAppStore(state => state.isLoading)
  const actions = useActions()
  return (
    <div className="flex grow flex-col items-center justify-center gap-8 py-24" data-testid="page-settings">
      <h1>Settings</h1>
      <Status />
      <section className="flex w-full max-w-md flex-col gap-3" data-testid="settings-data">
        <h3 className="mb-0">Your data</h3>
        <p className="text-sm text-white/60">Your tasks live only in this browser. Export them to a JSON file to back them up or move them to another device, and import a file to restore them.</p>
        <ImportExportButtons />
      </section>
      <TextSetting description="How you are referred to when your tasks are displayed." disabled={isLoading} id="input-name" label="Name" maxLength={50} onChange={setUserName} placeholder="Me" value={userName} />
      <TextSetting
        description="A URL to notify with your progress, see the docs for details."
        disabled={isLoading}
        id="input-webhook"
        label="Webhook (optional)"
        maxLength={150}
        onChange={setWebhook}
        pattern="^https?://.+$"
        placeholder="https://example.com/hook"
        value={webhook}
      />
      <SyncSetting />
      <section className="flex w-full max-w-md flex-col gap-3" data-testid="settings-coach">
        <h3 className="mb-0">Voice coach</h3>
        <p className="text-sm text-white/60">Whether the coach greets you on the tasks page, and which language it speaks and listens in.</p>
        <CoachLanguagePicker onChange={coachSetting.setValue} value={coachSetting.value} />
      </section>
      <FloatingMenu actions={actions} />
    </div>
  )
}
