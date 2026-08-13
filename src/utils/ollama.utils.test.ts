import { checkOllamaReachable, createOllamaSession } from './ollama.utils'

const ollamaUrl = 'http://localhost:11434'

function ndjsonResponse(chunks: object[]) {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(`${JSON.stringify(chunk)}\n`))
      controller.close()
    },
  })
  return new Response(stream, { status: 200 })
}

async function collect(iterable: AsyncIterable<string> | Iterable<string>): Promise<string[]> {
  const results: string[] = []
  for await (const chunk of iterable) results.push(chunk)
  return results
}

describe('ollama.utils checkOllamaReachable', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('A resolves when the server responds ok', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response(undefined, { status: 200 })))
    await expect(checkOllamaReachable(ollamaUrl)).resolves.toBeUndefined()
  })

  it('B throws when the server responds with an error status', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response(undefined, { status: 500 })))
    await expect(checkOllamaReachable(ollamaUrl)).rejects.toThrow(`Cannot reach Ollama at ${ollamaUrl}`)
  })

  it('C throws when the request itself fails', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new Error('network error')))
    await expect(checkOllamaReachable(ollamaUrl)).rejects.toThrow(`Cannot reach Ollama at ${ollamaUrl}`)
  })
})

describe('ollama.utils createOllamaSession', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('A streams accumulated response chunks and posts the accumulated message history', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(ndjsonResponse([{ message: { content: 'Hel' } }, { message: { content: 'lo' } }]))
    vi.stubGlobal('fetch', fetchMock)
    const session = createOllamaSession(ollamaUrl, 'be brief')

    const chunks = await collect(session.promptStreaming('hi'))
    expect(chunks).toStrictEqual(['Hel', 'Hello'])

    const [, options] = fetchMock.mock.calls[0] ?? []
    const body: unknown = JSON.parse((options as { body: string }).body)
    expect(body).toStrictEqual({
      messages: [
        { content: 'be brief', role: 'system' },
        { content: 'hi', role: 'user' },
      ],
      model: 'qwen2.5:3b-instruct',
      stream: true,
    })
  })

  it('B keeps prior turns in history on the next prompt', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(ndjsonResponse([{ message: { content: 'Hello' } }]))
      .mockResolvedValueOnce(ndjsonResponse([{ message: { content: 'Sure' } }]))
    vi.stubGlobal('fetch', fetchMock)
    const session = createOllamaSession(ollamaUrl, 'be brief')

    await collect(session.promptStreaming('hi'))
    await collect(session.promptStreaming('ok now what'))

    const [, secondOptions] = fetchMock.mock.calls[1] ?? []
    const body: unknown = JSON.parse((secondOptions as { body: string }).body)
    expect(body).toStrictEqual({
      messages: [
        { content: 'be brief', role: 'system' },
        { content: 'hi', role: 'user' },
        { content: 'Hello', role: 'assistant' },
        { content: 'ok now what', role: 'user' },
      ],
      model: 'qwen2.5:3b-instruct',
      stream: true,
    })
  })

  it('C strips a trailing slash from the configured URL', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(ndjsonResponse([{ message: { content: 'hi' } }]))
    vi.stubGlobal('fetch', fetchMock)
    const session = createOllamaSession('http://localhost:11434/', 'be brief')
    await collect(session.promptStreaming('hi'))
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:11434/api/chat', expect.anything())
  })

  it('D throws when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response(undefined, { status: 500, statusText: 'Internal Server Error' })))
    const session = createOllamaSession(ollamaUrl, 'be brief')
    await expect(collect(session.promptStreaming('hi'))).rejects.toThrow('Ollama request failed: 500 Internal Server Error')
  })

  it('F skips blank lines and chunks without message content', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(`\n${JSON.stringify({ message: { content: 'hi' } })}\n${JSON.stringify({ done: true })}\n`))
        controller.close()
      },
    })
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response(stream, { status: 200 })))
    const session = createOllamaSession(ollamaUrl, 'be brief')
    await expect(collect(session.promptStreaming('hi'))).resolves.toStrictEqual(['hi'])
  })

  it('E destroy clears the message history', () => {
    const session = createOllamaSession(ollamaUrl, 'be brief')
    expect(() => session.destroy()).not.toThrow()
  })
})
