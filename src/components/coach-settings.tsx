import { useAppStore } from '../store/use-app-store'
import { useCoachSetting } from '../utils/pages.utils'
import { CoachLanguagePicker } from './coach-language-picker'
import { TextSetting } from './text-setting'

/**
 * Settings section for the voice coach: whether it's enabled and which language it speaks, plus
 * the endpoint of the local Ollama server it talks to for its model backend.
 * @returns the voice coach setting section element
 */
export function CoachSettings() {
  const coachSetting = useCoachSetting()
  const ollamaUrl = useAppStore(state => state.data.settings.ollamaUrl)
  const setOllamaUrl = useAppStore(state => state.setOllamaUrl)
  const isLoading = useAppStore(state => state.isLoading)

  return (
    <section className="flex w-full max-w-md flex-col gap-3" data-testid="settings-coach">
      <h3 className="mb-0">Voice coach</h3>
      <p className="text-sm text-white/60">Whether the coach greets you on the tasks page, and which language it speaks and listens in.</p>
      <CoachLanguagePicker onChange={coachSetting.setValue} value={coachSetting.value} />
      <TextSetting
        description="Where the coach's local Ollama server is running."
        disabled={isLoading}
        id="input-ollama-url"
        label="Ollama endpoint"
        maxLength={150}
        onChange={setOllamaUrl}
        pattern="^https?://.+$"
        placeholder="http://localhost:11434"
        value={ollamaUrl}
      />
    </section>
  )
}
