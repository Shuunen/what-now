import { invariant } from 'es-toolkit'
import type { PocketTtsEvent, PocketTtsRequest } from '../workers/pocket-tts-protocol'

function fakeAudioBufferSourceNode() {
  const listeners = new Map<string, (() => void)[]>()
  return {
    addEventListener(type: string, listener: () => void) {
      const existing = listeners.get(type) ?? []
      existing.push(listener)
      listeners.set(type, existing)
    },
    buffer: undefined as unknown,
    connect() {
      // no-op -- nothing to assert on the destination node
    },
    start() {
      for (const listener of listeners.get('ended') ?? []) listener()
    },
  }
}

function fakeAudioContext() {
  return {
    close: () => Promise.resolve(),
    createBuffer(_channels: number, length: number, sampleRate: number) {
      return { copyToChannel: vi.fn<() => void>(), length, sampleRate }
    },
    createBufferSource: fakeAudioBufferSourceNode,
    destination: {},
  }
}

type FakeWorker = { emit: (data: PocketTtsEvent) => void; postMessage: (message: PocketTtsRequest) => void; sent: PocketTtsRequest[] }

const fakeWorkers: FakeWorker[] = []

function fakeWorker(): FakeWorker {
  const listeners: ((event: { data: PocketTtsEvent }) => void)[] = []
  const sent: PocketTtsRequest[] = []
  const instance = {
    addEventListener(type: string, listener: (event: { data: PocketTtsEvent }) => void) {
      if (type === 'message') listeners.push(listener)
    },
    emit(data: PocketTtsEvent) {
      for (const listener of listeners) listener({ data })
    },
    postMessage(message: PocketTtsRequest) {
      sent.push(message)
    },
    sent,
  }
  fakeWorkers.push(instance)
  return instance
}

async function waitForRequest(worker: FakeWorker, kind: PocketTtsRequest['kind'], count: number) {
  await vi.waitFor(() => {
    if (worker.sent.filter(message => message.kind === kind).length < count) throw new Error('request not sent yet')
  })
}

/**
 * Waits for speakWithPocketTts to create its worker and send its first "init" request.
 * @returns the fake worker instance that received the request
 */
async function waitForWorkerReady() {
  await vi.waitFor(() => {
    if (fakeWorkers.length === 0) throw new Error('worker not created yet')
  })
  const worker = fakeWorkers.at(-1)
  invariant(worker, 'worker not created')
  await waitForRequest(worker, 'init', 1)
  return worker
}

describe('pocket-tts.utils', () => {
  beforeEach(() => {
    fakeWorkers.length = 0
    vi.resetModules()
    vi.stubGlobal('Worker', fakeWorker)
    globalThis.window.AudioContext = fakeAudioContext as unknown as typeof AudioContext
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    globalThis.window.AudioContext = undefined as unknown as typeof AudioContext
  })

  it('A speakWithPocketTts inits then generates, and resolves once playback ends', async () => {
    const { speakWithPocketTts } = await import('./pocket-tts.utils')
    const promise = speakWithPocketTts('hello', 'en')

    const worker = await waitForWorkerReady()
    const initRequest = worker.sent.at(0)
    invariant(initRequest, 'init request not sent')
    worker.emit({ kind: 'rpc_ok', payload: { sampleRate: 24_000 }, requestId: initRequest.requestId })

    await waitForRequest(worker, 'generate', 1)
    const generateRequest = worker.sent.at(-1)
    invariant(generateRequest, 'generate request not sent')
    worker.emit({ audio: new Float32Array([0.1, 0.2]), kind: 'audio', requestId: generateRequest.requestId, sampleRate: 24_000 })

    await expect(promise).resolves.toBeUndefined()
  })

  it('B speakWithPocketTts rejects when init fails', async () => {
    const { speakWithPocketTts } = await import('./pocket-tts.utils')
    const promise = speakWithPocketTts('hello', 'en')

    const worker = await waitForWorkerReady()
    const initRequest = worker.sent.at(0)
    invariant(initRequest, 'init request not sent')
    worker.emit({ error: 'model assets not found', kind: 'rpc_err', requestId: initRequest.requestId })

    await expect(promise).rejects.toThrow('model assets not found')
  })

  it('C speakWithPocketTts does not retry a language that already failed this session', async () => {
    const { speakWithPocketTts } = await import('./pocket-tts.utils')
    const firstAttempt = speakWithPocketTts('hello', 'en')
    const worker = await waitForWorkerReady()
    const initRequest = worker.sent.at(0)
    invariant(initRequest, 'init request not sent')
    worker.emit({ error: 'model assets not found', kind: 'rpc_err', requestId: initRequest.requestId })
    await expect(firstAttempt).rejects.toThrow('model assets not found')

    await expect(speakWithPocketTts('again', 'en')).rejects.toThrow('previously failed')
    expect(worker.sent.filter(message => message.kind === 'init')).toHaveLength(1)
  })

  it('E speakWithPocketTts reuses an already-ready language/voice without re-sending init', async () => {
    const { speakWithPocketTts } = await import('./pocket-tts.utils')
    const firstAttempt = speakWithPocketTts('hello', 'en')
    const worker = await waitForWorkerReady()
    const firstInit = worker.sent.at(0)
    invariant(firstInit, 'init request not sent')
    worker.emit({ kind: 'rpc_ok', payload: { sampleRate: 24_000 }, requestId: firstInit.requestId })
    await waitForRequest(worker, 'generate', 1)
    const firstGenerate = worker.sent.at(-1)
    invariant(firstGenerate, 'generate request not sent')
    worker.emit({ audio: new Float32Array([0.1]), kind: 'audio', requestId: firstGenerate.requestId, sampleRate: 24_000 })
    await firstAttempt

    const secondAttempt = speakWithPocketTts('again', 'en')
    await waitForRequest(worker, 'generate', 2)
    const secondGenerate = worker.sent.at(-1)
    invariant(secondGenerate, 'generate request not sent')
    worker.emit({ audio: new Float32Array([0.1]), kind: 'audio', requestId: secondGenerate.requestId, sampleRate: 24_000 })
    await secondAttempt

    expect(worker.sent.filter(message => message.kind === 'init')).toHaveLength(1)
  })

  it('F speakWithPocketTts falls back to webkitAudioContext when AudioContext is unavailable', async () => {
    globalThis.window.AudioContext = undefined as unknown as typeof AudioContext
    globalThis.window.webkitAudioContext = fakeAudioContext as unknown as typeof AudioContext

    const { speakWithPocketTts } = await import('./pocket-tts.utils')
    const promise = speakWithPocketTts('hello', 'en')
    const worker = await waitForWorkerReady()
    const initRequest = worker.sent.at(0)
    invariant(initRequest, 'init request not sent')
    worker.emit({ kind: 'rpc_ok', payload: { sampleRate: 24_000 }, requestId: initRequest.requestId })
    await waitForRequest(worker, 'generate', 1)
    const generateRequest = worker.sent.at(-1)
    invariant(generateRequest, 'generate request not sent')
    worker.emit({ audio: new Float32Array([0.1]), kind: 'audio', requestId: generateRequest.requestId, sampleRate: 24_000 })

    await expect(promise).resolves.toBeUndefined()
    globalThis.window.webkitAudioContext = undefined
  })
})
