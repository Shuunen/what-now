import { useCallback, useState } from 'react'
import { CoachLanguagePicker, type CoachLanguage } from '../components/coach-language-picker'
import { CoachStatusPanel, type CoachStatus } from '../components/coach-status-panel'
import { CoachSummaryPanel } from '../components/coach-summary-panel'
import { FloatingMenu } from '../components/floating-menu'
import { Button } from '../components/ui/button'
import { toastError } from '../store/use-toast-store'
import { isBrowserSupported, runCoachSession, stopAfterTurns } from '../utils/coach-browser-session.utils'
import { useActions } from '../utils/pages.utils'

/**
 * Experimental in-browser voice coach page: English/French toggle over
 * Web Speech API + Chrome's on-device Prompt API. Session/orchestration
 * logic lives in src/utils/coach-browser-session.utils.ts -- this file is
 * just the React shell (state, callbacks, rendering).
 */

type Status = CoachStatus

type PageSetters = {
  setDownloadProgress: (value: number) => void
  setLastResponse: (value: string) => void
  setLastTranscript: (value: string) => void
  setStatus: (value: Status) => void
  setSummaryLines: (value: string[]) => void
  setTurn: (value: number) => void
}

async function startRun(setters: PageSetters, language: CoachLanguage): Promise<void> {
  try {
    const lines = await runCoachSession(
      {
        onDownloadProgress: setters.setDownloadProgress,
        onResponse: setters.setLastResponse,
        onStatusChange: setters.setStatus,
        onTranscript: setters.setLastTranscript,
        onTurnChange: setters.setTurn,
      },
      language,
    )
    setters.setSummaryLines(lines)
    setters.setStatus('done')
    console.log(lines.join('\n'))
  } catch (error) {
    setters.setStatus('error')
    toastError(error instanceof Error ? error.message : 'Unknown error running the browser coach')
  }
}

export function PageCoachBrowser() {
  const actions = useActions()
  const [status, setStatus] = useState<Status>('idle')
  const [language, setLanguage] = useState<CoachLanguage>('en')
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [turn, setTurn] = useState(0)
  const [lastTranscript, setLastTranscript] = useState('')
  const [lastResponse, setLastResponse] = useState('')
  const [summaryLines, setSummaryLines] = useState<string[]>([])

  const handleStart = useCallback(() => {
    void startRun({ setDownloadProgress, setLastResponse, setLastTranscript, setStatus, setSummaryLines, setTurn }, language)
  }, [language])

  const isSupported = isBrowserSupported()

  return (
    <div className="flex grow flex-col items-center justify-center gap-6 p-4 text-center" data-testid="page-coach-browser">
      <h1>Browser Voice Coach (experiment)</h1>
      <p className="max-w-md text-sm text-white/60">Web Speech API (STT + TTS) and Chrome&apos;s on-device Prompt API, no server, no Ollama. {stopAfterTurns} exchanges, then a timing summary -- compare against the coach/ Pipecat spike.</p>

      {!isSupported && (
        <p className="max-w-md text-sm text-error" data-testid="coach-browser-unsupported">
          This browser doesn&apos;t support everything needed (Chrome&apos;s on-device Prompt API + Web Speech API). Try a recent Chrome/Chromium build.
        </p>
      )}

      {isSupported && status === 'idle' && (
        <>
          <CoachLanguagePicker language={language} onChange={setLanguage} />
          <Button data-testid="coach-browser-start" name="Start" onClick={handleStart}>
            Start
          </Button>
        </>
      )}

      <CoachStatusPanel downloadProgress={downloadProgress} lastResponse={lastResponse} lastTranscript={lastTranscript} status={status} stopAfterTurns={stopAfterTurns} turn={turn} />

      {status === 'done' && <CoachSummaryPanel onRunAgain={handleStart} summaryLines={summaryLines} />}

      <FloatingMenu actions={actions} />
    </div>
  )
}
