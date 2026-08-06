import { type CoachCallbacks, type CoachTaskActions, runCoachSession } from './coach-session.utils'
import { taskMock } from './tasks.utils'

const { listenOnceMock, promptToTextMock, speakMock } = vi.hoisted(() => ({
  listenOnceMock: vi.fn<(speechLang: string) => Promise<string>>(),
  promptToTextMock: vi.fn<(session: unknown, input: string) => Promise<string>>(),
  speakMock: vi.fn<(text: string, speechLang: string) => Promise<void>>(),
}))

vi.mock(import('./coach-speech.utils'), () => ({
  listenOnce: listenOnceMock,
  primeMicrophonePermission: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  promptToText: promptToTextMock,
  speak: speakMock,
}))

function* emptyStream() {
  /* no chunks -- the session's response text always comes from promptToTextMock in these tests */
}

function noopSession() {
  return { destroy: vi.fn<() => void>(), promptStreaming: () => emptyStream() }
}

function fakeLanguageModel(availability: 'available' | 'downloadable', onCreate?: (options: LanguageModelCreateOptions) => void) {
  return {
    availability: vi.fn<() => Promise<LanguageModelAvailability>>().mockResolvedValue(availability),
    create: vi.fn<(options?: LanguageModelCreateOptions) => Promise<LanguageModelSession>>().mockImplementation(options => {
      if (options) onCreate?.(options)
      return Promise.resolve(noopSession())
    }),
  }
}

function makeCallbacks(): CoachCallbacks {
  return {
    onDownloadProgress: vi.fn<(loaded: number) => void>(),
    onOutcome: vi.fn<(outcome: unknown) => void>(),
    onResponse: vi.fn<(text: string) => void>(),
    onStatusChange: vi.fn<(status: unknown) => void>(),
    onTaskChange: vi.fn<(task: unknown) => void>(),
    onTranscript: vi.fn<(text: string) => void>(),
  }
}

describe('coach-session.utils runCoachSession', () => {
  beforeEach(() => {
    listenOnceMock.mockReset()
    promptToTextMock.mockReset().mockResolvedValue('spoken response')
    speakMock.mockReset().mockResolvedValue(undefined)
    globalThis.window.LanguageModel = fakeLanguageModel('available')
  })

  afterEach(() => {
    globalThis.window.LanguageModel = undefined
  })

  it('A ends immediately with no active tasks', async () => {
    const callbacks = makeCallbacks()
    const actions: CoachTaskActions = { getTasks: () => [], markDone: vi.fn<(id: string) => void>(), writeReason: vi.fn<(id: string, reason: string) => void>() }
    const outcomes = await runCoachSession(callbacks, 'en', actions)
    expect(outcomes).toStrictEqual([])
    expect(callbacks.onStatusChange).toHaveBeenCalledWith('done')
  })

  it('B asks for a missing reason and writes the answer back', async () => {
    const task = taskMock({ completedOn: '', id: 'a', reason: undefined })
    listenOnceMock.mockResolvedValueOnce('because it matters')
    const writeReason = vi.fn<(id: string, reason: string) => void>()
    let tasks = [task]
    const actions: CoachTaskActions = {
      getTasks: () => tasks,
      markDone: vi.fn<(id: string) => void>(),
      writeReason: (id, reason) => {
        writeReason(id, reason)
        tasks = [{ ...task, reason }]
      },
    }
    const outcomes = await runCoachSession(makeCallbacks(), 'en', actions)
    expect(writeReason).toHaveBeenCalledWith('a', 'because it matters')
    expect(outcomes.at(0)).toStrictEqual({ kind: 'answered-reason', taskName: task.name })
  })

  it('B2 does not write a reason when the user gives an empty answer', async () => {
    const task = taskMock({ completedOn: '', id: 'a', reason: undefined })
    listenOnceMock.mockResolvedValueOnce('   ')
    const writeReason = vi.fn<(id: string, reason: string) => void>()
    let calls = 0
    const actions: CoachTaskActions = {
      getTasks: () => {
        calls += 1
        return calls === 1 ? [task] : []
      },
      markDone: vi.fn<(id: string) => void>(),
      writeReason,
    }
    const outcomes = await runCoachSession(makeCallbacks(), 'en', actions)
    expect(writeReason).not.toHaveBeenCalled()
    expect(outcomes).toStrictEqual([{ kind: 'answered-reason', taskName: task.name }])
  })

  it('C marks a task done when the reply says so', async () => {
    const task = taskMock({ completedOn: '', id: 'a', reason: 'a good reason' })
    listenOnceMock.mockResolvedValueOnce('yes done')
    const markDone = vi.fn<(id: string) => void>()
    let tasks = [task]
    const actions: CoachTaskActions = {
      getTasks: () => tasks,
      markDone: id => {
        markDone(id)
        tasks = []
      },
      writeReason: vi.fn<(id: string, reason: string) => void>(),
    }
    const outcomes = await runCoachSession(makeCallbacks(), 'en', actions)
    expect(markDone).toHaveBeenCalledWith('a')
    expect(outcomes).toStrictEqual([{ kind: 'done', taskName: task.name }])
  })

  it('D delays a task, leaving it in the queue but skipped this session', async () => {
    const task = taskMock({ completedOn: '', id: 'a', reason: 'a good reason' })
    listenOnceMock.mockResolvedValueOnce('delay it')
    const actions: CoachTaskActions = { getTasks: () => [task], markDone: vi.fn<(id: string) => void>(), writeReason: vi.fn<(id: string, reason: string) => void>() }
    const outcomes = await runCoachSession(makeCallbacks(), 'en', actions)
    expect(outcomes).toStrictEqual([{ kind: 'delayed', taskName: task.name }])
  })

  it('E snoozes a task', async () => {
    const task = taskMock({ completedOn: '', id: 'a', reason: 'a good reason' })
    listenOnceMock.mockResolvedValueOnce("I'm busy")
    const actions: CoachTaskActions = { getTasks: () => [task], markDone: vi.fn<(id: string) => void>(), writeReason: vi.fn<(id: string, reason: string) => void>() }
    const outcomes = await runCoachSession(makeCallbacks(), 'en', actions)
    expect(outcomes).toStrictEqual([{ kind: 'snoozed', taskName: task.name }])
  })

  it('F asks for another task', async () => {
    const task = taskMock({ completedOn: '', id: 'a', reason: 'a good reason' })
    listenOnceMock.mockResolvedValueOnce('give me another one')
    const actions: CoachTaskActions = { getTasks: () => [task], markDone: vi.fn<(id: string) => void>(), writeReason: vi.fn<(id: string, reason: string) => void>() }
    const outcomes = await runCoachSession(makeCallbacks(), 'en', actions)
    expect(outcomes).toStrictEqual([{ kind: 'skipped', taskName: task.name }])
  })

  it('G re-asks once on an unclear reply, then skips if still unclear', async () => {
    const task = taskMock({ completedOn: '', id: 'a', reason: 'a good reason' })
    listenOnceMock.mockResolvedValueOnce('what a nice day').mockResolvedValueOnce('still unrelated')
    const actions: CoachTaskActions = { getTasks: () => [task], markDone: vi.fn<(id: string) => void>(), writeReason: vi.fn<(id: string, reason: string) => void>() }
    const outcomes = await runCoachSession(makeCallbacks(), 'en', actions)
    expect(speakMock).toHaveBeenCalledWith("Sorry, I didn't catch that -- say done, delay, another, or snooze.", 'en-US')
    expect(outcomes).toStrictEqual([{ kind: 'skipped', taskName: task.name }])
  })

  it('H runs in French when requested', async () => {
    const task = taskMock({ completedOn: '', id: 'a', reason: 'une bonne raison' })
    listenOnceMock.mockResolvedValueOnce('fait')
    const markDone = vi.fn<(id: string) => void>()
    const actions: CoachTaskActions = { getTasks: () => [task], markDone, writeReason: vi.fn<(id: string, reason: string) => void>() }
    await runCoachSession(makeCallbacks(), 'fr', actions)
    expect(markDone).toHaveBeenCalledWith('a')
    expect(speakMock).toHaveBeenCalledWith('spoken response', 'fr-FR')
  })

  it('I reports download progress when the model needs downloading', async () => {
    const onDownloadProgress = vi.fn<(loaded: number) => void>()
    globalThis.window.LanguageModel = fakeLanguageModel('downloadable', options => {
      options.monitor?.({ addEventListener: (_type, listener) => listener({ loaded: 0.5 } as LanguageModelDownloadProgressEvent) } as LanguageModelCreateMonitor)
    })
    const callbacks = { ...makeCallbacks(), onDownloadProgress }
    const actions: CoachTaskActions = { getTasks: () => [], markDone: vi.fn<(id: string) => void>(), writeReason: vi.fn<(id: string, reason: string) => void>() }
    await runCoachSession(callbacks, 'en', actions)
    expect(callbacks.onStatusChange).toHaveBeenCalledWith('downloading')
    expect(onDownloadProgress).toHaveBeenCalledWith(0.5)
  })
})
