import { invariant } from 'es-toolkit'
import type { CoachLanguage } from '../components/coach-language-picker'
import type { CoachStatus } from '../components/coach-status-panel'
import { BrowserTimingLog } from './browser-coach-timing.utils'

/**
 * Pure session/orchestration logic for the experimental in-browser voice
 * coach (see src/pages/page-coach-browser.tsx for the React shell): Web
 * Speech API (STT + TTS) and Chrome's on-device Prompt API (LanguageModel
 * / Gemini Nano) instead of the Pipecat + Ollama + Whisper + Kokoro stack
 * in coach/. Built to take the exact same timing measurements as
 * coach/server/timing.py for a direct side-by-side comparison. See the
 * design doc's Measured Results for the Pipecat numbers this compares
 * against, including the French mode comparison (coach/'s Kokoro French
 * voice was rejected as robotic).
 */

// Same task as coach/server/spike.py's English baseline, so the two
// experiments are comparable. Always authored in English -- the system
// prompt below asks the model to translate it when the target language isn't English.
const spikeTask = { name: 'call your best friend', reason: "you haven't talked in a week" }

export const stopAfterTurns = 3

type LanguageConfig = {
  // BCP-47 code for SpeechRecognition.lang / SpeechSynthesisUtterance.lang.
  speechLang: string
  systemPrompt: string
}

// modelLanguageCode is the bare ISO 639-1 code LanguageModel's
// expectedInputs/expectedOutputs wants (console warning if omitted:
// "specify a supported output language code: [de, en, es, fr, ja]").
const languageConfigs: Record<CoachLanguage, LanguageConfig> = {
  en: {
    speechLang: 'en-US',
    systemPrompt: `You are a warm, brief voice coach for the What Now task app.
You have one task to offer: "${spikeTask.name}" (reason: ${spikeTask.reason}).
Announce it in one short sentence and ask if the user is ready to do it now,
wants to delay it, wants another task, or is done with it already.
Keep every response under 2 sentences -- this is spoken aloud.`,
  },
  fr: {
    speechLang: 'fr-FR',
    systemPrompt: `Tu es un coach vocal chaleureux et concis pour l'application de tâches What Now.
Tu dois toujours répondre en français.
Voici la tâche à proposer (les détails ci-dessous sont en anglais -- traduis-les
en français avant de les prononcer, ne les répète jamais en anglais) :
name: "${spikeTask.name}"
reason: "${spikeTask.reason}"
Annonce cette tâche en une phrase courte et demande si la personne est prête à
la faire maintenant, veut la reporter, veut une autre tâche, ou l'a déjà faite.
Chaque réponse doit tenir en 2 phrases maximum -- c'est prononcé à voix haute.`,
  },
}

const modelLanguageCodes: Record<CoachLanguage, string> = { en: 'en', fr: 'fr' }

export type CoachCallbacks = {
  onDownloadProgress: (loaded: number) => void
  onResponse: (text: string) => void
  onStatusChange: (status: CoachStatus) => void
  onTranscript: (text: string) => void
  onTurnChange: (turn: number) => void
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | undefined {
  return globalThis.window.SpeechRecognition ?? globalThis.window.webkitSpeechRecognition
}

export function isBrowserSupported(): boolean {
  return globalThis.window.LanguageModel !== undefined && getSpeechRecognition() !== undefined && globalThis.speechSynthesis !== undefined
}

/**
 * Waits for a single utterance from the user via the Web Speech API.
 *
 * Records listening_start/listening_stop at the API's own `speechstart`/
 * `speechend` events -- the true moments speech begins/ends -- rather than
 * at recognition-start/result. The previous version recorded listening_start
 * the instant we began waiting for speech, which silently included the
 * user's reaction/thinking time before they started talking at all; that's
 * not what Pipecat's VAD-driven listening_start measures (VAD only fires
 * once real speech is actually detected), so the two were not comparable.
 * @param timingLog - records listening_start/listening_stop/stt_stop at their real moments
 * @param speechLang - BCP-47 language code for recognition (e.g. "en-US", "fr-FR")
 * @returns the recognized transcript
 */
function listenOnce(timingLog: BrowserTimingLog, speechLang: string): Promise<string> {
  // oxlint-disable-next-line promise/avoid-new -- wraps a callback-based Web API (SpeechRecognition), no promise-returning equivalent exists
  return new Promise((resolve, reject) => {
    const Recognition = getSpeechRecognition()
    invariant(Recognition, 'SpeechRecognition not supported in this browser')
    const recognition = new Recognition()
    recognition.lang = speechLang
    recognition.continuous = false
    recognition.interimResults = false
    recognition.addEventListener('speechstart', () => {
      timingLog.record('listening_start')
    })
    recognition.addEventListener('speechend', () => {
      timingLog.record('listening_stop')
    })
    recognition.addEventListener('result', event => {
      timingLog.record('stt_stop')
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
 * @param speechLang - BCP-47 language code for the utterance and voice selection (e.g. "en-US", "fr-FR")
 */
function speak(text: string, speechLang: string): Promise<void> {
  // oxlint-disable-next-line promise/avoid-new -- wraps a callback-based Web API (SpeechSynthesisUtterance), no promise-returning equivalent exists
  return new Promise((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = speechLang
    // Diagnostic only, no behavior change: TTS duration is meaningless without
    // knowing the response length and which voice actually spoke it (a more
    // natural-sounding voice legitimately taking longer isn't the same thing
    // as a slow voice). Also surfaces whether the voice is local or a network-
    // dependent one (see the design doc: the English default was "Google US
    // English" with localService:false -- not actually offline).
    const [languagePrefix] = speechLang.split('-')
    const defaultVoice = speechSynthesis.getVoices().find(voice => voice.lang.startsWith(languagePrefix ?? speechLang))
    console.log(`[coach-browser] speaking ${text.length} chars with voice "${defaultVoice?.name ?? 'unknown'}" (localService: ${defaultVoice?.localService ?? 'unknown'})`)
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
 * @param language - the coach's language, drives the system prompt and the
 *   model's expectedInputs/expectedOutputs (Chrome warns and may degrade
 *   output quality if this isn't specified -- supported codes: de, en, es, fr, ja)
 * @returns the created session
 */
async function createCoachSession(callbacks: CoachCallbacks, language: CoachLanguage): Promise<LanguageModelSession> {
  callbacks.onStatusChange('checking')
  const modelLanguageCode = modelLanguageCodes[language]
  const availability = await globalThis.window.LanguageModel?.availability({
    expectedInputs: [{ languages: [modelLanguageCode], type: 'text' }],
    expectedOutputs: [{ languages: [modelLanguageCode], type: 'text' }],
  })
  invariant(availability, 'LanguageModel.availability() returned nothing')
  invariant(availability !== 'unavailable', 'This device cannot run the on-device model (unavailable).')

  if (availability !== 'available') callbacks.onStatusChange('downloading')
  const session = await globalThis.window.LanguageModel?.create({
    expectedInputs: [{ languages: [modelLanguageCode], type: 'text' }],
    expectedOutputs: [{ languages: [modelLanguageCode], type: 'text' }],
    initialPrompts: [{ content: languageConfigs[language].systemPrompt, role: 'system' }],
    monitor(monitor) {
      monitor.addEventListener('downloadprogress', event => {
        callbacks.onDownloadProgress(event.loaded)
      })
    },
  })
  invariant(session, 'LanguageModel.create() returned nothing')
  return session
}

type RunTurnOptions = {
  callbacks: CoachCallbacks
  session: LanguageModelSession
  speechLang: string
  timingLog: BrowserTimingLog
}

async function runTurn({ callbacks, session, speechLang, timingLog }: RunTurnOptions): Promise<void> {
  callbacks.onStatusChange('listening')
  // listening_start/listening_stop/stt_stop are recorded inside listenOnce(),
  // at the API's real speechstart/speechend/result events -- not here.
  const transcript = await listenOnce(timingLog, speechLang)
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
  await speak(response, speechLang)
  timingLog.record('tts_stop')
  timingLog.record('playing_stop')
}

/**
 * Runs the full experiment: create the session, then stopAfterTurns
 * listen/query/speak exchanges, then tear down and return the timing summary.
 * @param callbacks - status/progress callbacks driving the page's UI
 * @param language - which language config to run the coach in
 * @returns the timing summary lines, ready to render/log
 */
export async function runCoachSession(callbacks: CoachCallbacks, language: CoachLanguage): Promise<string[]> {
  await primeMicrophonePermission()
  const session = await createCoachSession(callbacks, language)
  const timingLog = new BrowserTimingLog(performance.now())
  timingLog.record('model_ready')
  callbacks.onStatusChange('ready')

  const { speechLang } = languageConfigs[language]
  for (let turnIndex = 1; turnIndex <= stopAfterTurns; turnIndex += 1) {
    callbacks.onTurnChange(turnIndex)
    // eslint-disable-next-line no-await-in-loop -- turns are inherently sequential (each depends on the previous one's audio finishing)
    await runTurn({ callbacks, session, speechLang, timingLog })
  }

  session.destroy()
  return timingLog.summaryLines()
}
