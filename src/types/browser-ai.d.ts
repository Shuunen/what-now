/**
 * Ambient types for browser APIs not yet in TypeScript's DOM lib: Chrome's
 * on-device Prompt API (`LanguageModel`, origin-trial-era, no official
 * types yet) and the vendor-prefixed Web Speech API (`webkitSpeechRecognition`).
 * Deliberately minimal -- only what src/pages/page-coach-browser.tsx uses.
 */

type LanguageModelAvailability = 'available' | 'downloadable' | 'downloading' | 'unavailable'

interface LanguageModelMessage {
  content: string
  role: 'assistant' | 'system' | 'user'
}

interface LanguageModelDownloadProgressEvent extends Event {
  loaded: number
}

interface LanguageModelCreateMonitor extends EventTarget {
  addEventListener(type: 'downloadprogress', listener: (event: LanguageModelDownloadProgressEvent) => void): void
}

interface LanguageModelExpectedContent {
  languages: string[]
  type: 'text'
}

interface LanguageModelCreateOptions {
  expectedInputs?: LanguageModelExpectedContent[]
  expectedOutputs?: LanguageModelExpectedContent[]
  initialPrompts?: LanguageModelMessage[]
  monitor?: (monitor: LanguageModelCreateMonitor) => void
}

interface LanguageModelSession {
  destroy: () => void
  promptStreaming: (input: string) => ReadableStream<string>
}

interface LanguageModelAvailabilityOptions {
  expectedInputs?: LanguageModelExpectedContent[]
  expectedOutputs?: LanguageModelExpectedContent[]
}

interface LanguageModelStatic {
  availability: (options?: LanguageModelAvailabilityOptions) => Promise<LanguageModelAvailability>
  create: (options?: LanguageModelCreateOptions) => Promise<LanguageModelSession>
}

interface SpeechRecognitionResultLike {
  0: { transcript: string }
  isFinal: boolean
}

interface SpeechRecognitionEventLike extends Event {
  results: ArrayLike<SpeechRecognitionResultLike>
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  addEventListener(type: 'end' | 'speechend' | 'speechstart' | 'start', listener: () => void): void
  addEventListener(type: 'error', listener: (event: SpeechRecognitionErrorEventLike) => void): void
  addEventListener(type: 'result', listener: (event: SpeechRecognitionEventLike) => void): void
  start: () => void
  stop: () => void
}

interface Window {
  LanguageModel?: LanguageModelStatic
  SpeechRecognition?: new () => SpeechRecognitionLike
  webkitSpeechRecognition?: new () => SpeechRecognitionLike
}
