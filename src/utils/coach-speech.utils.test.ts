import { isBrowserSupported, listenOnce, primeMicrophonePermission, promptToText, speak } from './coach-speech.utils'

function makeFakeRecognition(outcome: 'error' | 'result') {
  return class {
    public continuous = false
    public interimResults = false
    public lang = ''
    public listeners = new Map<string, ((event: unknown) => void)[]>()
    public stop = () => {
      this.listeners.clear()
    }
    public addEventListener(type: string, listener: (event: unknown) => void) {
      const existing = this.listeners.get(type) ?? []
      existing.push(listener)
      this.listeners.set(type, existing)
    }
    public start() {
      const payload = outcome === 'result' ? { results: [[{ transcript: 'done' }]] } : { error: 'no-speech' }
      for (const listener of this.listeners.get(outcome) ?? []) listener(payload)
    }
  }
}

function fakeUtterance(text: string) {
  const listeners = new Map<string, ((event: unknown) => void)[]>()
  return {
    addEventListener(type: string, listener: (event: unknown) => void) {
      const existing = listeners.get(type) ?? []
      existing.push(listener)
      listeners.set(type, existing)
    },
    fire(type: string, event: unknown = {}) {
      for (const listener of listeners.get(type) ?? []) listener(event)
    },
    lang: '',
    text,
  }
}

function* streamChunks(chunks: string[]) {
  for (const chunk of chunks) yield chunk
}

function streamOf(chunks: string[]) {
  return { destroy: vi.fn<() => void>(), promptStreaming: () => streamChunks(chunks) }
}

describe('coach-speech.utils', () => {
  afterEach(() => {
    globalThis.window.SpeechRecognition = undefined
    vi.unstubAllGlobals()
  })

  it('A isBrowserSupported is false when nothing is available', () => {
    expect(isBrowserSupported()).toBe(false)
  })

  it('B isBrowserSupported is true when every API is present', () => {
    globalThis.window.SpeechRecognition = makeFakeRecognition('result') as unknown as new () => SpeechRecognitionLike
    vi.stubGlobal('speechSynthesis', { getVoices: () => [], speak: vi.fn<() => void>() })
    expect(isBrowserSupported()).toBe(true)
  })

  it('C listenOnce resolves with the recognized transcript', async () => {
    globalThis.window.SpeechRecognition = makeFakeRecognition('result') as unknown as new () => SpeechRecognitionLike
    await expect(listenOnce('en-US')).resolves.toBe('done')
  })

  it('D listenOnce rejects on a recognition error', async () => {
    globalThis.window.SpeechRecognition = makeFakeRecognition('error') as unknown as new () => SpeechRecognitionLike
    await expect(listenOnce('en-US')).rejects.toThrow('speech recognition error: no-speech')
  })

  it('D2 listenOnce falls back to the vendor-prefixed webkitSpeechRecognition', async () => {
    globalThis.window.webkitSpeechRecognition = makeFakeRecognition('result') as unknown as new () => SpeechRecognitionLike
    await expect(listenOnce('en-US')).resolves.toBe('done')
    globalThis.window.webkitSpeechRecognition = undefined
  })

  it('D3 listenOnce falls back to an empty transcript when no result is present', async () => {
    const EmptyResultRecognition = class extends makeFakeRecognition('result') {
      public override start() {
        for (const listener of this.listeners.get('result') ?? []) listener({ results: [] })
      }
    }
    globalThis.window.SpeechRecognition = EmptyResultRecognition as unknown as new () => SpeechRecognitionLike
    await expect(listenOnce('en-US')).resolves.toBe('')
  })

  it('D4 listenOnce resolves with an empty transcript when recognition ends on silence without a result or error', async () => {
    const SilentRecognition = class extends makeFakeRecognition('result') {
      public override start() {
        for (const listener of this.listeners.get('end') ?? []) listener({})
      }
    }
    globalThis.window.SpeechRecognition = SilentRecognition as unknown as new () => SpeechRecognitionLike
    await expect(listenOnce('en-US')).resolves.toBe('')
  })

  it('D5 listenOnce ignores a trailing end event once already settled by a result', async () => {
    const TrailingEndRecognition = class extends makeFakeRecognition('result') {
      public override start() {
        for (const listener of this.listeners.get('result') ?? []) listener({ results: [[{ transcript: 'done' }]] })
        for (const listener of this.listeners.get('end') ?? []) listener({})
      }
    }
    globalThis.window.SpeechRecognition = TrailingEndRecognition as unknown as new () => SpeechRecognitionLike
    await expect(listenOnce('en-US')).resolves.toBe('done')
  })

  it('E speak resolves once the utterance ends', async () => {
    const spokenTexts: string[] = []
    // oxlint-disable-next-line prefer-arrow-callback -- speak() calls `new SpeechSynthesisUtterance(...)`, which arrow functions can't serve as
    vi.stubGlobal('SpeechSynthesisUtterance', function fakeSpeechSynthesisUtterance(text: string) {
      spokenTexts.push(text)
      return fakeUtterance(text)
    })
    vi.stubGlobal('speechSynthesis', {
      speak: (utterance: ReturnType<typeof fakeUtterance>) => utterance.fire('end'),
    })
    await expect(speak('hello', 'en-US')).resolves.toBeUndefined()
    expect(spokenTexts).toStrictEqual(['hello'])
  })

  it('F speak rejects on a synthesis error', async () => {
    // oxlint-disable-next-line prefer-arrow-callback -- speak() calls `new SpeechSynthesisUtterance(...)`, which arrow functions can't serve as
    vi.stubGlobal('SpeechSynthesisUtterance', function fakeSpeechSynthesisUtterance(text: string) {
      return fakeUtterance(text)
    })
    vi.stubGlobal('speechSynthesis', {
      speak: (utterance: ReturnType<typeof fakeUtterance>) => utterance.fire('error', { error: 'synthesis-failed' }),
    })
    await expect(speak('hello', 'en-US')).rejects.toThrow('speech synthesis error')
  })

  it('G promptToText accumulates cumulative chunks', async () => {
    await expect(promptToText(streamOf(['Hel', 'Hello']), 'hi')).resolves.toBe('Hello')
  })

  it('H promptToText accumulates delta chunks', async () => {
    await expect(promptToText(streamOf(['Hel', 'lo']), 'hi')).resolves.toBe('Hello')
  })

  it('I primeMicrophonePermission stops every track it obtains', async () => {
    const stop = vi.fn<() => void>()
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn<() => Promise<{ getTracks: () => { stop: () => void }[] }>>().mockResolvedValue({ getTracks: () => [{ stop }] }) } })
    await primeMicrophonePermission()
    expect(stop).toHaveBeenCalledOnce()
  })
})
