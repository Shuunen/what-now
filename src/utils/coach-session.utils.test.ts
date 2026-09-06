import { invariant } from 'es-toolkit'
import type { CoachAction } from './coach-actions.utils'
import { type CoachCallbacks, type CoachOutcome, type CoachTaskActions, runCoachSession } from './coach-session.utils'
import type { CoachSession } from './ollama.utils'
import { taskMock } from './tasks.utils'

const { checkOllamaReachableMock, createOllamaSessionMock, extractActionsMock, listenOnceMock, promptToTextMock, speakMock } = vi.hoisted(() => ({
  checkOllamaReachableMock: vi.fn<(ollamaUrl: string) => Promise<void>>(),
  createOllamaSessionMock: vi.fn<(ollamaUrl: string, systemPrompt: string) => CoachSession>(),
  extractActionsMock: vi.fn<(options: unknown) => Promise<CoachAction[]>>(),
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

vi.mock(import('./coach-actions.utils'), () => ({ extractActions: extractActionsMock }))

function* emptyStream() {
  /* no chunks -- the session's response text always comes from promptToTextMock in these tests */
}

function noopSession(): CoachSession {
  return { destroy: vi.fn<() => void>(), promptStreaming: () => emptyStream() }
}

function makeCallbacks(): CoachCallbacks {
  return {
    onOutcome: vi.fn<(outcome: CoachOutcome) => void>(),
    onResponse: vi.fn<(text: string) => void>(),
    onStatusChange: vi.fn<(status: unknown) => void>(),
    onTaskChange: vi.fn<(task: unknown) => void>(),
    onTranscript: vi.fn<(text: string) => void>(),
  }
}

/** the conversation stops once three listens in a row come back silent, so tests end by going quiet */
function goSilent() {
  listenOnceMock.mockResolvedValue('')
}

/**
 * Joins every directive the model was prompted with -- what the coach was actually told each turn.
 * @returns the directives, separated by a marker line
 */
function directives() {
  return promptToTextMock.mock.calls.map(call => call[1]).join('\n---\n')
}

const ollamaUrl = 'http://localhost:11434'

describe('coach-session.utils runCoachSession', () => {
  beforeEach(() => {
    listenOnceMock.mockReset().mockResolvedValue('')
    promptToTextMock.mockReset().mockResolvedValue('spoken response')
    speakMock.mockReset().mockResolvedValue(undefined)
    checkOllamaReachableMock.mockReset().mockResolvedValue(undefined)
    createOllamaSessionMock.mockReset().mockReturnValue(noopSession())
    extractActionsMock.mockReset().mockResolvedValue([])
  })

  it('A opens by greeting and briefing on the whole task list, not one task at a time', async () => {
    const tasks = [taskMock({ completedOn: '', id: 'a', minutes: 5, name: 'water the plants', reason: 'they die otherwise' }), taskMock({ completedOn: '', id: 'b', minutes: 20, name: 'vacuum' })]
    goSilent()
    const actions: CoachTaskActions = { getTasks: () => tasks, markDone: vi.fn<(id: string) => void>(), writeReason: vi.fn<(id: string, reason: string) => void>() }
    await runCoachSession({ actions, callbacks: makeCallbacks(), language: 'en', ollamaUrl })
    const opening = promptToTextMock.mock.calls[0]?.[1] ?? ''
    expect(opening).toContain('water the plants')
    expect(opening).toContain('vacuum')
    expect(opening).toContain('Greet him')
    expect(opening).toContain('roughly 25 minutes')
  })

  it('B completes a task from a free-form reply, with no keyword needed', async () => {
    const task = taskMock({ completedOn: '', id: 'a', name: 'dishes', reason: 'the kitchen smells otherwise' })
    listenOnceMock.mockResolvedValueOnce('yeah I knocked the dishes out this morning').mockResolvedValue('')
    extractActionsMock.mockResolvedValueOnce([{ kind: 'complete', number: 1 }])
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
    const callbacks = makeCallbacks()
    await runCoachSession({ actions, callbacks, language: 'en', ollamaUrl })
    expect(markDone).toHaveBeenCalledWith('a')
    expect(callbacks.onOutcome).toHaveBeenCalledWith({ kind: 'completed', taskName: 'dishes' })
  })

  it('C tells the coach what the app just did, so it can acknowledge it', async () => {
    const taskA = taskMock({ completedOn: '', id: 'a', name: 'dishes', reason: 'a good reason' })
    const taskB = taskMock({ completedOn: '', id: 'b', name: 'vacuum', reason: 'another good reason' })
    listenOnceMock.mockResolvedValueOnce('dishes are done').mockResolvedValue('')
    extractActionsMock.mockResolvedValueOnce([{ kind: 'complete', number: 1 }])
    let tasks = [taskA, taskB]
    const actions: CoachTaskActions = {
      getTasks: () => tasks,
      markDone: () => {
        tasks = [taskB]
      },
      writeReason: vi.fn<(id: string, reason: string) => void>(),
    }
    await runCoachSession({ actions, callbacks: makeCallbacks(), language: 'en', ollamaUrl })
    const reply = promptToTextMock.mock.calls[1]?.[1] ?? ''
    expect(reply).toContain('marked "dishes" as done')
    expect(reply).toContain('dishes are done')
  })

  it('D records a reason spoken in passing', async () => {
    const task = taskMock({ completedOn: '', id: 'a', name: 'vacuum', reason: undefined })
    listenOnceMock.mockResolvedValueOnce('the vacuum matters because my allergies get bad').mockResolvedValue('')
    extractActionsMock.mockResolvedValueOnce([{ kind: 'reason', number: 1, text: 'my allergies get bad' }])
    const writeReason = vi.fn<(id: string, reason: string) => void>()
    const actions: CoachTaskActions = { getTasks: () => [task], markDone: vi.fn<(id: string) => void>(), writeReason }
    const callbacks = makeCallbacks()
    await runCoachSession({ actions, callbacks, language: 'en', ollamaUrl })
    expect(writeReason).toHaveBeenCalledWith('a', 'my allergies get bad')
    expect(callbacks.onOutcome).toHaveBeenCalledWith({ kind: 'reason-added', taskName: 'vacuum' })
  })

  it('E stops offering a task he set aside, without ending the conversation', async () => {
    const taskA = taskMock({ completedOn: '', id: 'a', name: 'dishes', reason: 'a good reason' })
    const taskB = taskMock({ completedOn: '', id: 'b', name: 'vacuum', reason: 'another good reason' })
    listenOnceMock.mockResolvedValueOnce('not the dishes, I am too tired').mockResolvedValue('')
    extractActionsMock.mockResolvedValueOnce([{ kind: 'skip', number: 1 }])
    const actions: CoachTaskActions = { getTasks: () => [taskA, taskB], markDone: vi.fn<(id: string) => void>(), writeReason: vi.fn<(id: string, reason: string) => void>() }
    await runCoachSession({ actions, callbacks: makeCallbacks(), language: 'en', ollamaUrl })
    const reply = promptToTextMock.mock.calls[1]?.[1] ?? ''
    expect(reply).toContain('vacuum')
    // the briefing no longer lists it -- it only shows up in the "set aside" summary
    expect(reply).not.toContain('"dishes" --')
    expect(reply).toContain('set "dishes" aside')
  })

  it('F says goodbye when he asks to stop', async () => {
    const task = taskMock({ completedOn: '', id: 'a', name: 'dishes', reason: 'a good reason' })
    listenOnceMock.mockResolvedValueOnce('alright that is enough for today').mockResolvedValue('')
    extractActionsMock.mockResolvedValueOnce([{ kind: 'end' }])
    const actions: CoachTaskActions = { getTasks: () => [task], markDone: vi.fn<(id: string) => void>(), writeReason: vi.fn<(id: string, reason: string) => void>() }
    await runCoachSession({ actions, callbacks: makeCallbacks(), language: 'en', ollamaUrl })
    expect(promptToTextMock.mock.calls.at(-1)?.[1]).toContain('wants to stop here')
    expect(promptToTextMock).toHaveBeenCalledTimes(2)
  })

  it('G congratulates him once nothing is left', async () => {
    const task = taskMock({ completedOn: '', id: 'a', name: 'dishes', reason: 'a good reason' })
    listenOnceMock.mockResolvedValueOnce('done with the dishes').mockResolvedValue('')
    extractActionsMock.mockResolvedValueOnce([{ kind: 'complete', number: 1 }])
    let tasks = [task]
    const actions: CoachTaskActions = {
      getTasks: () => tasks,
      markDone: () => {
        tasks = []
      },
      writeReason: vi.fn<(id: string, reason: string) => void>(),
    }
    await runCoachSession({ actions, callbacks: makeCallbacks(), language: 'en', ollamaUrl })
    expect(promptToTextMock.mock.calls.at(-1)?.[1]).toContain('Everything on his list is done')
  })

  it('H checks in warmly on silence instead of reciting a canned phrase', async () => {
    const task = taskMock({ completedOn: '', id: 'a', name: 'dishes', reason: 'a good reason' })
    goSilent()
    const actions: CoachTaskActions = { getTasks: () => [task], markDone: vi.fn<(id: string) => void>(), writeReason: vi.fn<(id: string, reason: string) => void>() }
    await runCoachSession({ actions, callbacks: makeCallbacks(), language: 'en', ollamaUrl })
    expect(directives()).toContain('Check in on him warmly')
    expect(speakMock).not.toHaveBeenCalledWith(expect.stringContaining('catch that'), expect.any(String))
  })

  it('I gives up after three silent turns in a row', async () => {
    const task = taskMock({ completedOn: '', id: 'a', name: 'dishes', reason: 'a good reason' })
    goSilent()
    const actions: CoachTaskActions = { getTasks: () => [task], markDone: vi.fn<(id: string) => void>(), writeReason: vi.fn<(id: string, reason: string) => void>() }
    await runCoachSession({ actions, callbacks: makeCallbacks(), language: 'en', ollamaUrl })
    expect(promptToTextMock).toHaveBeenCalledTimes(3)
  })

  it('J ignores an action naming a task the coach was never shown', async () => {
    const task = taskMock({ completedOn: '', id: 'a', name: 'dishes', reason: 'a good reason' })
    listenOnceMock.mockResolvedValueOnce('what about the laundry').mockResolvedValue('')
    extractActionsMock.mockResolvedValueOnce([{ kind: 'complete', number: 7 }])
    const markDone = vi.fn<(id: string) => void>()
    const actions: CoachTaskActions = { getTasks: () => [task], markDone, writeReason: vi.fn<(id: string, reason: string) => void>() }
    await runCoachSession({ actions, callbacks: makeCallbacks(), language: 'en', ollamaUrl })
    expect(markDone).not.toHaveBeenCalled()
  })

  it('K runs in French when requested', async () => {
    const task = taskMock({ completedOn: '', id: 'a', name: 'la vaisselle', reason: 'une bonne raison' })
    goSilent()
    const actions: CoachTaskActions = { getTasks: () => [task], markDone: vi.fn<(id: string) => void>(), writeReason: vi.fn<(id: string, reason: string) => void>() }
    await runCoachSession({ actions, callbacks: makeCallbacks(), language: 'fr', ollamaUrl })
    expect(speakMock).toHaveBeenCalledWith('spoken response', 'fr-FR')
    const [, systemPrompt] = createOllamaSessionMock.mock.calls[0] ?? []
    invariant(systemPrompt, 'the session must be created with a system prompt')
    expect(systemPrompt).toContain('coach quotidien')
  })

  it('L creates the Ollama session against the given endpoint', async () => {
    goSilent()
    const actions: CoachTaskActions = { getTasks: () => [], markDone: vi.fn<(id: string) => void>(), writeReason: vi.fn<(id: string, reason: string) => void>() }
    const callbacks = makeCallbacks()
    await runCoachSession({ actions, callbacks, language: 'en', ollamaUrl: 'http://example.test:11434' })
    expect(checkOllamaReachableMock).toHaveBeenCalledWith('http://example.test:11434')
    expect(createOllamaSessionMock).toHaveBeenCalledWith('http://example.test:11434', expect.any(String))
    expect(callbacks.onStatusChange).toHaveBeenCalledWith('done')
  })
})
