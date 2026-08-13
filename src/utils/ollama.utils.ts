import { invariant } from 'es-toolkit'

/**
 * Thin client for a local Ollama server's chat API -- the voice coach's model
 * backend (see src/utils/coach-session.utils.ts for the orchestration built
 * on top). Ollama's /api/chat is stateless, so the session keeps the full
 * message history itself and resends it every turn.
 */

export type CoachSession = {
  destroy: () => void
  // promptToText() only ever consumes this via a `for await` loop, which iterates sync or async
  // iterables alike -- the broader union lets test doubles use a plain generator.
  promptStreaming: (input: string) => AsyncIterable<string> | Iterable<string>
}

// Picked for being small enough to run fast on modest hardware while still
// following multi-turn instructions reliably, and for solid multilingual
// support across every language the coach speaks (see coach-language.utils.ts's languageConfigs).
const ollamaModel = 'qwen2.5:3b-instruct'

type OllamaMessage = { content: string; role: 'assistant' | 'system' | 'user' }

type OllamaChatChunk = { message?: { content: string } }

/**
 * Splits a buffer of newline-delimited JSON on complete lines, parsing each
 * one into a chat chunk. The last, possibly-incomplete line is left for the
 * caller to prepend to the next read.
 * @param buffer - text accumulated so far, potentially containing multiple lines
 * @returns the parsed chunks from every complete line, and the leftover incomplete line
 */
function parseNdjsonLines(buffer: string): { chunks: OllamaChatChunk[]; rest: string } {
  const lines = buffer.split('\n')
  const rest = lines.pop()
  invariant(rest !== undefined, 'split() always returns at least one element')
  const chunks = lines.filter(line => line.trim() !== '').map(line => JSON.parse(line) as OllamaChatChunk)
  return { chunks, rest }
}

/**
 * Checks that an Ollama server is reachable at the given URL.
 * @param ollamaUrl - base URL of the Ollama server, e.g. "http://localhost:11434"
 */
export async function checkOllamaReachable(ollamaUrl: string): Promise<void> {
  const response = await fetch(`${ollamaUrl.replace(/\/$/u, '')}/api/tags`).catch(() => undefined)
  invariant(response?.ok, `Cannot reach Ollama at ${ollamaUrl} -- is it running?`)
}

/**
 * Creates a chat session against a local Ollama server. The full
 * conversation (starting with the system prompt) is kept in memory and
 * resent on every turn, since Ollama itself doesn't track session state.
 * @param ollamaUrl - base URL of the Ollama server, e.g. "http://localhost:11434"
 * @param systemPrompt - the coach's system prompt, sent once as the first message
 * @returns a session exposing promptStreaming(input) and destroy()
 */
export function createOllamaSession(ollamaUrl: string, systemPrompt: string): CoachSession {
  const messages: OllamaMessage[] = [{ content: systemPrompt, role: 'system' }]

  async function* promptStreaming(input: string): AsyncIterable<string> {
    messages.push({ content: input, role: 'user' })
    const response = await fetch(`${ollamaUrl.replace(/\/$/u, '')}/api/chat`, {
      body: JSON.stringify({ messages, model: ollamaModel, stream: true }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    invariant(response.ok, `Ollama request failed: ${response.status} ${response.statusText}`)
    invariant(response.body, 'Ollama response has no body')

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
    let full = ''
    let buffer = ''
    for (;;) {
      // oxlint-disable-next-line no-await-in-loop -- reading a single stream's chunks is inherently sequential
      const { done, value } = await reader.read()
      if (done) break
      const { chunks, rest } = parseNdjsonLines(buffer + value)
      buffer = rest
      for (const chunk of chunks) {
        if (!chunk.message?.content) continue
        full += chunk.message.content
        yield full
      }
    }
    messages.push({ content: full, role: 'assistant' })
  }

  return {
    destroy() {
      messages.length = 0
    },
    promptStreaming,
  }
}
