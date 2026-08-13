import { invariant } from 'es-toolkit'
import type { CoachSession } from './ollama.utils'

/**
 * Thin wrappers over the browser's Web Speech API (STT + TTS) -- no
 * coach-domain knowledge here, see src/utils/coach-session.utils.ts for the
 * orchestration built on top, and src/utils/ollama.utils.ts for the model
 * backend.
 */

/**
 * @returns the browser's SpeechRecognition constructor, vendor-prefixed or not, if available
 */
function getSpeechRecognition(): (new () => SpeechRecognitionLike) | undefined {
  return globalThis.window.SpeechRecognition ?? globalThis.window.webkitSpeechRecognition
}

export function isBrowserSupported(): boolean {
  return getSpeechRecognition() !== undefined && globalThis.speechSynthesis !== undefined
}

/**
 * Waits for a single utterance from the user via the Web Speech API.
 * @param speechLang - BCP-47 language code for recognition (e.g. "en-US", "fr-FR")
 * @returns the recognized transcript
 */
export function listenOnce(speechLang: string): Promise<string> {
  // oxlint-disable-next-line promise/avoid-new -- wraps a callback-based Web API (SpeechRecognition), no promise-returning equivalent exists
  return new Promise((resolve, reject) => {
    const Recognition = getSpeechRecognition()
    invariant(Recognition, 'SpeechRecognition not supported in this browser')
    const recognition = new Recognition()
    recognition.lang = speechLang
    recognition.continuous = false
    recognition.interimResults = false
    let settled = false
    recognition.addEventListener('result', event => {
      settled = true
      resolve(event.results[0]?.[0]?.transcript ?? '')
    })
    recognition.addEventListener('error', event => {
      settled = true
      reject(new Error(`speech recognition error: ${event.error}`))
    })
    // On silence, the browser stops recognizing and fires "end" without a prior
    // "result" or "error" -- without this, the promise would hang forever and the
    // caller's status would stay stuck on "listening" even though nothing is.
    recognition.addEventListener('end', () => {
      if (settled) return
      settled = true
      resolve('')
    })
    recognition.start()
  })
}

// Strips emoji from LLM output before it reaches the TTS engine, which otherwise speaks
// them out loud (e.g. "check mark button") -- a backstop for when the system prompt's
// "no emoji" instruction doesn't hold on the small on-device model.
const emojiPattern = /\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]|\u{FE0F}|\u{200D}/gu

/**
 * Speaks the given text via the Web Speech API and resolves once playback finishes.
 * @param text - the text to speak aloud
 * @param speechLang - BCP-47 language code for the utterance and voice selection (e.g. "en-US", "fr-FR")
 */
export function speak(text: string, speechLang: string): Promise<void> {
  // oxlint-disable-next-line promise/avoid-new -- wraps a callback-based Web API (SpeechSynthesisUtterance), no promise-returning equivalent exists
  return new Promise((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text.replaceAll(emojiPattern, '').replaceAll(/ {2,}/gu, ' ').trim())
    utterance.lang = speechLang
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
 * Streams a prompt response from the given session and accumulates it into
 * one string. Handles both cumulative and delta streaming semantics (the
 * Prompt API's chunk format isn't documented either way), by detecting
 * whether each new chunk extends the accumulated text or replaces it.
 * @param session - the coach session to prompt
 * @param input - the user's message
 * @returns the full accumulated response text
 */
export async function promptToText(session: CoachSession, input: string): Promise<string> {
  let full = ''
  for await (const chunk of session.promptStreaming(input)) full = chunk.startsWith(full) ? chunk : full + chunk
  return full
}

/**
 * Requests microphone permission up front, before anything else. Browsers
 * grant only one "fresh user activation" per gesture, and the LLM model
 * download can take long enough to consume it -- if the mic permission
 * request happens after that, it silently fails with `not-allowed` instead
 * of prompting, even on a real click. Once granted, the permission itself
 * persists for the page's lifetime; it's only the activation window for the
 * *prompt* that's scarce, so requesting first (immediately on click, before
 * any async model work) sidesteps this.
 */
export async function primeMicrophonePermission(): Promise<void> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  for (const track of stream.getTracks()) track.stop()
}
