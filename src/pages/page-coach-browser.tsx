import { invariant } from 'es-toolkit'
import { useCallback, useState } from 'react'
import { CoachStatusPanel, type CoachStatus } from '../components/coach-status-panel'
import { CoachSummaryPanel } from '../components/coach-summary-panel'
import { FloatingMenu } from '../components/floating-menu'
import { Button } from '../components/ui/button'
import { toastError } from '../store/use-toast-store'
import { BrowserTimingLog } from '../utils/browser-coach-timing.utils'
import { useActions } from '../utils/pages.utils'

/**
 * Experimental in-browser voice coach: Web Speech API (STT + TTS) and
 * Chrome's on-device Prompt API (LanguageModel / Gemini Nano) instead of
 * the Pipecat + Ollama + Whisper + Kokoro stack in coach/. English only,
 * for now -- built to take the exact same timing measurements as
 * coach/server/timing.py for a direct side-by-side comparison. See the
 * design doc's Measured Results for the Pipecat numbers this compares against.
 */

// Same task and prompt as coach/server/spike.py's English baseline (before
// the French detour), so the two experiments are comparable.
const spikeTask = { name: 'call your best friend', reason: "you haven't talked in a week" }

const systemPrompt = `You are a warm, brief voice coach for the What Now task app.
You have one task to offer: "${spikeTask.name}" (reason: ${spikeTask.reason}).
Announce it in one short sentence and ask if the user is ready to do it now,
wants to delay it, wants another task, or is done with it already.
Keep every response under 2 sentences -- this is spoken aloud.`

const stopAfterTurns = 3

type Status = CoachStatus

type CoachCallbacks = {
  onDownloadProgress: (loaded: number) => void
  onResponse: (text: string) => void
  onStatusChange: (status: Status) => void
  onTranscript: (text: string) => void
  onTurnChange: (turn: number) => void
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | undefined {
  return globalThis.window.SpeechRecognition ?? globalThis.window.webkitSpeechRecognition
}

function isBrowserSupported(): boolean {
  return globalThis.window.LanguageModel !== undefined && getSpeechRecognition() !== undefined && globalThis.speechSynthesis !== undefined
}

/**
 * Waits for a single utterance from the user via the Web Speech API.
 * @returns the recognized transcript
 */
function listenOnce(): Promise<string> {
  // oxlint-disable-next-line promise/avoid-new -- wraps a callback-based Web API (SpeechRecognition), no promise-returning equivalent exists
  return new Promise((resolve, reject) => {
    const Recognition = getSpeechRecognition()
    invariant(Recognition, 'SpeechRecognition not supported in this browser')
    const recognition = new Recognition()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.addEventListener('result', event => {
      resolve(event.results[0]?.[0]?.transcript ?? '')
    })
    recognition.addEventListener('error', event => {
      reject(new Error(`speech recognition error: ${event.error}`))
    })
    recognition.start()
  })
}

/**
 * Speaks the given text via the Web Speech API and resolves once playback finishes.
 * @param text - the text to speak aloud
 */
function speak(text: string): Promise<void> {
  // oxlint-disable-next-line promise/avoid-new -- wraps a callback-based Web API (SpeechSynthesisUtterance), no promise-returning equivalent exists
  return new Promise((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.addEventListener('end', () => {
      resolve()
    })
    utterance.addEventListener('error', event => {
      reject(new Error(`speech synthesis error: ${event.error}`))
    })
    speechSynthesis.speak(utterance)
  })
}

/**
 * Streams a prompt response from the given session, calling `onFirstChunk` once
 * as soon as any text arrives. Handles both cumulative and delta streaming
 * semantics (the Prompt API's chunk format isn't documented either way), by
 * detecting whether each new chunk extends the accumulated text or replaces it.
 * @param session - the LanguageModel session to prompt
 * @param input - the user's message
 * @param onFirstChunk - called once, when the first non-empty chunk arrives
 * @returns the full accumulated response text
 */
async function promptStreamingToText(session: LanguageModelSession, input: string, onFirstChunk: () => void): Promise<string> {
  let full = ''
  let firstChunkSeen = false
  for await (const chunk of session.promptStreaming(input)) {
    if (!firstChunkSeen && chunk.length > 0) {
      firstChunkSeen = true
      onFirstChunk()
    }
    full = chunk.startsWith(full) ? chunk : full + chunk
  }
  return full
}

/**
 * Requests microphone permission up front, before anything else. Browsers
 * grant only one "fresh user activation" per gesture, and the LLM model
 * download below can take long enough to consume it -- if the mic
 * permission request happens after that, it silently fails with
 * `not-allowed` instead of prompting, even on a real click. Once granted,
 * the permission itself persists for the page's lifetime; it's only the
 * activation window for the *prompt* that's scarce, so requesting first
 * (immediately on click, before any async model work) sidesteps this.
 */
async function primeMicrophonePermission(): Promise<void> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  for (const track of stream.getTracks()) track.stop()
}

/**
 * Checks model availability and creates a LanguageModel session, reporting
 * download progress via `callbacks` if the model needs downloading first.
 * @param callbacks - status/progress callbacks driving the page's UI
 * @returns the created session
 */
async function createCoachSession(callbacks: CoachCallbacks): Promise<LanguageModelSession> {
  callbacks.onStatusChange('checking')
  const availability = await globalThis.window.LanguageModel?.availability()
  invariant(availability, 'LanguageModel.availability() returned nothing')
  invariant(availability !== 'unavailable', 'This device cannot run the on-device model (unavailable).')

  if (availability !== 'available') callbacks.onStatusChange('downloading')
  const session = await globalThis.window.LanguageModel?.create({
    initialPrompts: [{ content: systemPrompt, role: 'system' }],
    monitor(monitor) {
      monitor.addEventListener('downloadprogress', event => {
        callbacks.onDownloadProgress(event.loaded)
      })
    },
  })
  invariant(session, 'LanguageModel.create() returned nothing')
  return session
}

async function runTurn(session: LanguageModelSession, timingLog: BrowserTimingLog, callbacks: CoachCallbacks): Promise<void> {
  callbacks.onStatusChange('listening')
  timingLog.record('listening_start')
  const transcript = await listenOnce()
  timingLog.record('listening_stop')
  timingLog.record('stt_stop') // Web Speech API has no separate STT-finalization step -- coincides with listening_stop
  callbacks.onTranscript(transcript)

  callbacks.onStatusChange('thinking')
  timingLog.record('agent_query_start')
  const response = await promptStreamingToText(session, transcript, () => {
    timingLog.record('agent_first_token')
  })
  timingLog.record('agent_query_stop')
  callbacks.onResponse(response)

  callbacks.onStatusChange('speaking')
  timingLog.record('tts_start')
  timingLog.record('playing_start') // Web Speech API has no separate synth-then-play step -- coincides with tts_start
  await speak(response)
  timingLog.record('tts_stop')
  timingLog.record('playing_stop')
}

/**
 * Runs the full experiment: create the session, then STOP_AFTER_TURNS
 * listen/query/speak exchanges, then tear down and return the timing summary.
 * @param callbacks - status/progress callbacks driving the page's UI
 * @returns the timing summary lines, ready to render/log
 */
async function runCoachSession(callbacks: CoachCallbacks): Promise<string[]> {
  await primeMicrophonePermission()
  const session = await createCoachSession(callbacks)
  const timingLog = new BrowserTimingLog(performance.now())
  timingLog.record('model_ready')
  callbacks.onStatusChange('ready')

  for (let turnIndex = 1; turnIndex <= stopAfterTurns; turnIndex += 1) {
    callbacks.onTurnChange(turnIndex)
    // eslint-disable-next-line no-await-in-loop -- turns are inherently sequential (each depends on the previous one's audio finishing)
    await runTurn(session, timingLog, callbacks)
  }

  session.destroy()
  return timingLog.summaryLines()
}

type PageSetters = {
  setDownloadProgress: (value: number) => void
  setLastResponse: (value: string) => void
  setLastTranscript: (value: string) => void
  setStatus: (value: Status) => void
  setSummaryLines: (value: string[]) => void
  setTurn: (value: number) => void
}

async function startRun(setters: PageSetters): Promise<void> {
  try {
    const lines = await runCoachSession({
      onDownloadProgress: setters.setDownloadProgress,
      onResponse: setters.setLastResponse,
      onStatusChange: setters.setStatus,
      onTranscript: setters.setLastTranscript,
      onTurnChange: setters.setTurn,
    })
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
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [turn, setTurn] = useState(0)
  const [lastTranscript, setLastTranscript] = useState('')
  const [lastResponse, setLastResponse] = useState('')
  const [summaryLines, setSummaryLines] = useState<string[]>([])

  const handleStart = useCallback(() => {
    void startRun({ setDownloadProgress, setLastResponse, setLastTranscript, setStatus, setSummaryLines, setTurn })
  }, [])

  const isSupported = isBrowserSupported()

  return (
    <div className="flex grow flex-col items-center justify-center gap-6 p-4 text-center" data-testid="page-coach-browser">
      <h1>Browser Voice Coach (experiment)</h1>
      <p className="max-w-md text-sm text-white/60">
        Web Speech API (STT + TTS) and Chrome&apos;s on-device Prompt API, no server, no Ollama. English only, {stopAfterTurns} exchanges, then a timing summary -- compare against the coach/ Pipecat spike.
      </p>

      {!isSupported && (
        <p className="max-w-md text-sm text-error" data-testid="coach-browser-unsupported">
          This browser doesn&apos;t support everything needed (Chrome&apos;s on-device Prompt API + Web Speech API). Try a recent Chrome/Chromium build.
        </p>
      )}

      {isSupported && status === 'idle' && (
        <Button data-testid="coach-browser-start" name="Start" onClick={handleStart}>
          Start
        </Button>
      )}

      <CoachStatusPanel downloadProgress={downloadProgress} lastResponse={lastResponse} lastTranscript={lastTranscript} status={status} stopAfterTurns={stopAfterTurns} turn={turn} />

      {status === 'done' && <CoachSummaryPanel onRunAgain={handleStart} summaryLines={summaryLines} />}

      <FloatingMenu actions={actions} />
    </div>
  )
}
