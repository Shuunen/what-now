import { extractActions } from './coach-actions.utils'
import { buildTaskBriefs } from './coach-brief.utils'
import { taskMock } from './tasks.utils'

const { askOllamaJsonMock } = vi.hoisted(() => ({ askOllamaJsonMock: vi.fn<(ollamaUrl: string, systemPrompt: string, input: string) => Promise<unknown>>() }))

vi.mock(import('./ollama.utils'), () => ({ askOllamaJson: askOllamaJsonMock }))

const briefs = buildTaskBriefs([taskMock({ completedOn: '', id: 'a', name: 'dishes' }), taskMock({ completedOn: '', id: 'b', name: 'vacuum' })], new Set<string>())

const ollamaUrl = 'http://localhost:11434'

function extract(transcript: string, coachLine = 'What do you feel like starting with?') {
  return extractActions({ briefs, coachLine, ollamaUrl, transcript })
}

describe('coach-actions.utils extractActions', () => {
  beforeEach(() => {
    askOllamaJsonMock.mockReset()
  })

  it('A reads a completion out of a free-form reply', async () => {
    askOllamaJsonMock.mockResolvedValue({ actions: [{ kind: 'complete', task: 1 }] })
    await expect(extract('yeah I knocked the dishes out this morning')).resolves.toStrictEqual([{ kind: 'complete', number: 1 }])
  })

  it('B reads several actions from one sentence', async () => {
    askOllamaJsonMock.mockResolvedValue({
      actions: [
        { kind: 'complete', task: 1 },
        { kind: 'skip', task: 2 },
      ],
    })
    await expect(extract('dishes are done, the vacuum can wait till tomorrow')).resolves.toStrictEqual([
      { kind: 'complete', number: 1 },
      { kind: 'skip', number: 2 },
    ])
  })

  it('C keeps the reason text he actually said', async () => {
    askOllamaJsonMock.mockResolvedValue({ actions: [{ kind: 'reason', task: 2, text: 'my allergies get bad' }] })
    await expect(extract('the vacuum matters because my allergies get bad')).resolves.toStrictEqual([{ kind: 'reason', number: 2, text: 'my allergies get bad' }])
  })

  it('D drops a reason with no text', async () => {
    askOllamaJsonMock.mockResolvedValue({ actions: [{ kind: 'reason', task: 2, text: '  ' }] })
    await expect(extract('hmm')).resolves.toStrictEqual([])
  })

  it('D2 drops a reason whose text the model forgot entirely', async () => {
    askOllamaJsonMock.mockResolvedValue({ actions: [{ kind: 'reason', task: 2 }] })
    await expect(extract('the vacuum, you know')).resolves.toStrictEqual([])
  })

  it('E keeps an end action, which needs no task', async () => {
    askOllamaJsonMock.mockResolvedValue({ actions: [{ kind: 'end' }] })
    await expect(extract('that is enough for today, thanks')).resolves.toStrictEqual([{ kind: 'end' }])
  })

  it('F drops an action naming a task that is not in the briefing', async () => {
    askOllamaJsonMock.mockResolvedValue({ actions: [{ kind: 'complete', task: 9 }] })
    await expect(extract('what about the laundry')).resolves.toStrictEqual([])
  })

  it('G returns nothing when he is just talking', async () => {
    askOllamaJsonMock.mockResolvedValue({ actions: [] })
    await expect(extract("ok I'll start with the dishes then")).resolves.toStrictEqual([])
  })

  it('H never breaks the conversation when the model answers nonsense', async () => {
    askOllamaJsonMock.mockResolvedValue({ whatever: 'not the shape we asked for' })
    await expect(extract('dishes are done')).resolves.toStrictEqual([])
  })

  it('I never breaks the conversation when the call itself fails', async () => {
    askOllamaJsonMock.mockRejectedValue(new Error('network error'))
    await expect(extract('dishes are done')).resolves.toStrictEqual([])
  })

  it('J does not call the model at all when he stayed silent', async () => {
    await expect(extract('   ')).resolves.toStrictEqual([])
    expect(askOllamaJsonMock).not.toHaveBeenCalled()
  })

  it('K shows the model the task list and both sides of the exchange', async () => {
    askOllamaJsonMock.mockResolvedValue({ actions: [] })
    await extract('I did the dishes', 'Fancy starting with the dishes?')
    const input = askOllamaJsonMock.mock.calls[0]?.[2]
    expect(input).toContain('1. "dishes"')
    expect(input).toContain('Fancy starting with the dishes?')
    expect(input).toContain('I did the dishes')
  })
})
