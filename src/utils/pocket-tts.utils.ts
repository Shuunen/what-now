import { invariant } from 'es-toolkit'
import type { DistributiveOmit, PocketTtsEvent, PocketTtsLanguage, PocketTtsRequest } from '../workers/pocket-tts-protocol'

/**
 * Main-thread client for the pocket-tts WASM worker (src/workers/pocket-tts.worker.ts).
 * All model/voice assets are static files under public/pocket-tts/, produced locally by
 * coach/install.sh -- nothing here ever calls a server or HuggingFace at runtime.
 * src/utils/coach-speech.utils.ts's speak() calls speakWithPocketTts() first and falls
 * back to the browser's native speechSynthesis if it throws (e.g. install.sh was never run).
 */

let worker: undefined | Worker = undefined
const pending = new Map<number, { reject: (error: Error) => void; resolve: (event: PocketTtsEvent) => void }>()
let nextRequestId = 0
let readyFor: string | undefined = undefined
const failedLanguages = new Set<PocketTtsLanguage>()

function getWorker(): Worker {
  worker ??= new Worker(new URL('../workers/pocket-tts.worker.ts', import.meta.url), { type: 'module' })
  worker.addEventListener('message', (event: MessageEvent<PocketTtsEvent>) => {
    const entry = pending.get(event.data.requestId)
    if (!entry) return
    pending.delete(event.data.requestId)
    if (event.data.kind === 'rpc_err') entry.reject(new Error(event.data.error))
    else entry.resolve(event.data)
  })
  return worker
}

function send(request: DistributiveOmit<PocketTtsRequest, 'requestId'>): Promise<PocketTtsEvent> {
  const requestId = nextRequestId
  nextRequestId += 1
  // oxlint-disable-next-line promise/avoid-new -- wraps a callback-based Worker message exchange, no promise-returning equivalent exists
  const result = new Promise<PocketTtsEvent>((resolve, reject) => {
    pending.set(requestId, { reject, resolve })
  })
  // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker.postMessage has no targetOrigin param, that's only for window.postMessage
  getWorker().postMessage({ ...request, requestId })
  return result
}

async function ensureReady(language: PocketTtsLanguage, voice: string): Promise<void> {
  if (failedLanguages.has(language)) throw new Error(`pocket-tts: ${language} previously failed to load, not retrying this session`)
  const key = `${language}:${voice}`
  if (readyFor === key) return
  try {
    await send({ kind: 'init', language, voice })
    readyFor = key
  } catch (error) {
    failedLanguages.add(language)
    throw error
  }
}

/**
 * Plays raw PCM samples through the Web Audio API and resolves once playback finishes.
 * @param samples - mono PCM samples
 * @param sampleRate - sample rate of `samples`, in Hz
 */
function playSamples(samples: Float32Array<ArrayBuffer>, sampleRate: number): Promise<void> {
  const AudioContextCtor = globalThis.window.AudioContext ?? globalThis.window.webkitAudioContext
  invariant(AudioContextCtor, 'AudioContext not supported in this browser')
  const context = new AudioContextCtor()
  const buffer = context.createBuffer(1, samples.length, sampleRate)
  buffer.copyToChannel(samples, 0)
  const source = context.createBufferSource()
  source.buffer = buffer
  source.connect(context.destination)
  // oxlint-disable-next-line promise/avoid-new -- wraps a callback-based Web Audio API (AudioBufferSourceNode), no promise-returning equivalent exists
  return new Promise(resolve => {
    source.addEventListener('ended', () => {
      resolve()
      void context.close()
    })
    source.start()
  })
}

/**
 * Synthesizes and plays `text` via the local pocket-tts WASM model, resolving once playback finishes.
 * Throws if the model/voice assets aren't installed (see coach/install.sh) or generation fails --
 * callers should fall back to another TTS engine on error.
 * @param text - the text to speak aloud
 * @param language - which pocket-tts model/voice set to use
 * @param voice - preset voice name (e.g. "jean"), defaults to the coach's default voice
 */
export async function speakWithPocketTts(text: string, language: PocketTtsLanguage, voice = 'jean'): Promise<void> {
  await ensureReady(language, voice)
  const event = await send({ kind: 'generate', text })
  invariant(event.kind === 'audio', `pocket-tts: expected an audio event, got "${event.kind}"`)
  await playSamples(event.audio, event.sampleRate)
}
