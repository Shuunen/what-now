import { type CoachCallbacks, type CoachTaskActions, runCoachSession } from './coach-session.utils'
import type { CoachSession } from './ollama.utils'
import { taskMock } from './tasks.utils'

const { checkOllamaReachableMock, createOllamaSessionMock, listenOnceMock, promptToTextMock, speakMock } = vi.hoisted(() => ({
  checkOllamaReachableMock: vi.fn<(ollamaUrl: string) => Promise<void>>(),
  createOllamaSessionMock: vi.fn<(ollamaUrl: string, systemPrompt: string) => CoachSession>(),
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

vi.mock(import('./ollama.utils'), () => ({
  checkOllamaReachable: checkOllamaReachableMock,
  createOllamaSession: createOllamaSessionMock,
}))

function* emptyStream() {
  /* no chunks -- the session's response text always comes from promptToTextMock in these tests */
}

function noopSession(): CoachSession {
  return { destroy: vi.fn<() => void>(), promptStreaming: () => emptyStream() }
}

function makeCallbacks(): CoachCallbacks {
  return {
    onOutcome: vi.fn<(outcome: unknown) => void>(),
    onResponse: vi.fn<(text: string) => void>(),
    onStatusChange: vi.fn<(status: unknown) => void>(),
    onTaskChange: vi.fn<(task: unknown) => void>(),
    onTranscript: vi.fn<(text: string) => void>(),
  }
}

const ollamaUrl = 'http://localhost:11434'

describe('coach-session.utils runCoachSession', () => {
  beforeEach(() => {
    listenOnceMock.mockReset()
    promptToTextMock.mockReset().mockResolvedValue('spoken response')
    speakMock.mockReset().mockResolvedValue(undefined)
    checkOllamaReachableMock.mockReset().mockResolvedValue(undefined)
    createOllamaSessionMock.mockReset().mockReturnValue(noopSession())
  })

  it('A ends immediately with no active tasks', async () => {
    const callbacks = makeCallbacks()
    const actions: CoachTaskActions = { getTasks: () => [], markDone: vi.fn<(id: string) => void>(), writeReason: vi.fn<(id: string, reason: string) => void>() }
    const outcomes = await runCoachSession({ actions, callbacks, language: 'en', ollamaUrl })
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
    const outcomes = await runCoachSession({ actions, callbacks: makeCallbacks(), language: 'en', ollamaUrl })
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
    const outcomes = await runCoachSession({ actions, callbacks: makeCallbacks(), language: 'en', ollamaUrl })
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
    const outcomes = await runCoachSession({ actions, callbacks: makeCallbacks(), language: 'en', ollamaUrl })
    expect(markDone).toHaveBeenCalledWith('a')
    expect(outcomes).toStrictEqual([{ kind: 'done', taskName: task.name }])
  })

  it('D delays a task, leaving it in the queue but skipped this session', async () => {
    const task = taskMock({ completedOn: '', id: 'a', reason: 'a good reason' })
    listenOnceMock.mockResolvedValueOnce('delay it')
    const actions: CoachTaskActions = { getTasks: () => [task], markDone: vi.fn<(id: string) => void>(), writeReason: vi.fn<(id: string, reason: string) => void>() }
    const outcomes = await runCoachSession({ actions, callbacks: makeCallbacks(), language: 'en', ollamaUrl })
    expect(outcomes).toStrictEqual([{ kind: 'delayed', taskName: task.name }])
  })

  it('E snoozes a task', async () => {
    const task = taskMock({ completedOn: '', id: 'a', reason: 'a good reason' })
    listenOnceMock.mockResolvedValueOnce("I'm busy")
    const actions: CoachTaskActions = { getTasks: () => [task], markDone: vi.fn<(id: string) => void>(), writeReason: vi.fn<(id: string, reason: string) => void>() }
    const outcomes = await runCoachSession({ actions, callbacks: makeCallbacks(), language: 'en', ollamaUrl })
    expect(outcomes).toStrictEqual([{ kind: 'snoozed', taskName: task.name }])
  })

  it('F asks for another task', async () => {
    const task = taskMock({ completedOn: '', id: 'a', reason: 'a good reason' })
    listenOnceMock.mockResolvedValueOnce('give me another one')
    const actions: CoachTaskActions = { getTasks: () => [task], markDone: vi.fn<(id: string) => void>(), writeReason: vi.fn<(id: string, reason: string) => void>() }
    const outcomes = await runCoachSession({ actions, callbacks: makeCallbacks(), language: 'en', ollamaUrl })
    expect(outcomes).toStrictEqual([{ kind: 'skipped', taskName: task.name }])
  })

  it('G re-asks once on an unclear reply, then skips if still unclear', async () => {
    const task = taskMock({ completedOn: '', id: 'a', reason: 'a good reason' })
    listenOnceMock.mockResolvedValueOnce('what a nice day').mockResolvedValueOnce('still unrelated')
    const actions: CoachTaskActions = { getTasks: () => [task], markDone: vi.fn<(id: string) => void>(), writeReason: vi.fn<(id: string, reason: string) => void>() }
    const outcomes = await runCoachSession({ actions, callbacks: makeCallbacks(), language: 'en', ollamaUrl })
    expect(speakMock).toHaveBeenCalledWith("Sorry, I didn't catch that -- say done, delay, another, or snooze.", 'en-US')
    expect(outcomes).toStrictEqual([{ kind: 'skipped', taskName: task.name }])
  })

  it('H runs in French when requested', async () => {
    const task = taskMock({ completedOn: '', id: 'a', reason: 'une bonne raison' })
    listenOnceMock.mockResolvedValueOnce('fait')
    const markDone = vi.fn<(id: string) => void>()
    const actions: CoachTaskActions = { getTasks: () => [task], markDone, writeReason: vi.fn<(id: string, reason: string) => void>() }
    await runCoachSession({ actions, callbacks: makeCallbacks(), language: 'fr', ollamaUrl })
    expect(markDone).toHaveBeenCalledWith('a')
    expect(speakMock).toHaveBeenCalledWith('spoken response', 'fr-FR')
  })

  it('I creates the Ollama session against the given endpoint', async () => {
    const actions: CoachTaskActions = { getTasks: () => [], markDone: vi.fn<(id: string) => void>(), writeReason: vi.fn<(id: string, reason: string) => void>() }
    await runCoachSession({ actions, callbacks: makeCallbacks(), language: 'en', ollamaUrl: 'http://example.test:11434' })
    expect(checkOllamaReachableMock).toHaveBeenCalledWith('http://example.test:11434')
    expect(createOllamaSessionMock).toHaveBeenCalledWith('http://example.test:11434', expect.any(String))
  })
})
