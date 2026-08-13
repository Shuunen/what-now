/**
 * Ambient types for browser APIs not yet in TypeScript's DOM lib: the
 * vendor-prefixed Web Speech API (`webkitSpeechRecognition`). Deliberately
 * minimal -- only what src/utils/coach-speech.utils.ts uses.
 */

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
  SpeechRecognition?: new () => SpeechRecognitionLike
  webkitSpeechRecognition?: new () => SpeechRecognitionLike
}
