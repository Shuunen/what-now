import { invariant } from 'es-toolkit'

/**
 * Thin wrappers over the browser's Web Speech API (STT + TTS) and Chrome's
 * on-device Prompt API (`LanguageModel`) -- no coach-domain knowledge here,
 * see src/utils/coach-session.utils.ts for the orchestration built on top.
 */

/**
 * @returns the browser's SpeechRecognition constructor, vendor-prefixed or not, if available
 */
function getSpeechRecognition(): (new () => SpeechRecognitionLike) | undefined {
  return globalThis.window.SpeechRecognition ?? globalThis.window.webkitSpeechRecognition
}

export function isBrowserSupported(): boolean {
  return globalThis.window.LanguageModel !== undefined && getSpeechRecognition() !== undefined && globalThis.speechSynthesis !== undefined
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
 * @param speechLang - BCP-47 language code for the utterance and voice selection (e.g. "en-US", "fr-FR")
 */
export function speak(text: string, speechLang: string): Promise<void> {
  // oxlint-disable-next-line promise/avoid-new -- wraps a callback-based Web API (SpeechSynthesisUtterance), no promise-returning equivalent exists
  return new Promise((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text)
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
 * @param session - the LanguageModel session to prompt
 * @param input - the user's message
 * @returns the full accumulated response text
 */
export async function promptToText(session: LanguageModelSession, input: string): Promise<string> {
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
