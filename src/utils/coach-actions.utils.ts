import { z } from 'zod/v4'
import { maxTaskTextLength } from '../schemas/task'
import { type CoachTaskBrief, describeTaskBriefs } from './coach-brief.utils'
import { logger } from './logger.utils'
import { askOllamaJson } from './ollama.utils'

/**
 * Works out what the app should actually *do* from a spoken exchange, using a
 * second, stateless model call in JSON mode rather than the keyword regexes
 * this replaces. Keywords forced the user to say "done", "delay", "another" or
 * "snooze" -- anything else fell through to a canned "I didn't catch that",
 * which is what made the coach feel like a phone menu. Here he can say "yeah I
 * knocked the dishes out this morning" or "not the vacuum, I'm too tired" and
 * still be understood.
 *
 * The extractor runs beside the conversation, never inside it: it is prompted
 * from scratch every time (see `askOllamaJson`), at temperature 0, so the
 * coach's own chattiness can't drift it, and it can't pollute the coach's
 * history. Any failure -- unreachable server, malformed JSON, a hallucinated
 * task number -- degrades to "no action", so a bad extraction can never break
 * or hijack the conversation.
 */

export type CoachAction = { kind: 'complete'; number: number } | { kind: 'end' } | { kind: 'reason'; number: number; text: string } | { kind: 'skip'; number: number }

const RawActionSchema = z.object({
  kind: z.enum(['complete', 'end', 'reason', 'skip']),
  task: z.number().int().positive().optional(),
  text: z.string().optional(),
})

const RawActionsSchema = z.object({
  actions: z.array(RawActionSchema).default([]),
})

const extractorPrompt = `You read one exchange between a task coach and a user, and extract what the app should do. Reply with JSON only, no prose, no explanation.

Shape: {"actions": [ ... ]} where each action is exactly one of:
{"kind": "complete", "task": <number>} -- he says that task is done, he did it, he just finished it, or he did it earlier
{"kind": "reason", "task": <number>, "text": "<why, in his own words>"} -- he explains why that task matters to him
{"kind": "skip", "task": <number>} -- he does not want that task now: later, tomorrow, another one instead, he is busy, he is not up for it
{"kind": "end"} -- he wants to stop the conversation: goodbye, that is enough, later, stop, he is leaving

Rules:
- Use the task numbers from the list exactly. Never invent a number that is not in the list.
- Saying he will do a task now, or agreeing to start it, is NOT "complete". Only completion counts.
- Several actions are allowed when he mentions several tasks in one sentence.
- Small talk, questions, thinking out loud, or agreeing to a suggestion produce {"actions": []}.

Examples:
List: 1. "dishes" 2. "vacuum"
He said: "yeah I knocked the dishes out this morning" -> {"actions": [{"kind": "complete", "task": 1}]}
He said: "not the vacuum, I'm way too tired for that" -> {"actions": [{"kind": "skip", "task": 2}]}
He said: "dishes are done, and the vacuum can wait till tomorrow" -> {"actions": [{"kind": "complete", "task": 1}, {"kind": "skip", "task": 2}]}
He said: "the vacuum matters because my allergies get bad otherwise" -> {"actions": [{"kind": "reason", "task": 2, "text": "my allergies get bad otherwise"}]}
He said: "ok I'll start with the dishes then" -> {"actions": []}
He said: "alright that's enough for today, thanks" -> {"actions": [{"kind": "end"}]}`

/**
 * Maps one validated raw action onto a typed action, dropping the ones that
 * name a task the model was never shown.
 * @param raw - the parsed action from the model
 * @param numbers - the task numbers that were actually in the briefing
 * @returns the typed action, or undefined when it must be dropped
 */
function toCoachAction(raw: z.infer<typeof RawActionSchema>, numbers: Set<number>): CoachAction | undefined {
  if (raw.kind === 'end') return { kind: 'end' }
  if (raw.task === undefined || !numbers.has(raw.task)) return undefined
  if (raw.kind === 'complete') return { kind: 'complete', number: raw.task }
  if (raw.kind === 'skip') return { kind: 'skip', number: raw.task }
  const text = (raw.text ?? '').trim().slice(0, maxTaskTextLength)
  if (text === '') return undefined
  return { kind: 'reason', number: raw.task, text }
}

export type ExtractActionsOptions = {
  briefs: CoachTaskBrief[]
  coachLine: string
  ollamaUrl: string
  transcript: string
}

/**
 * Extracts the actions the user's reply implies.
 * @param root0 - the exchange to read, and where to reach the model
 * @param root0.briefs - the numbered briefs the coach was shown for this turn
 * @param root0.coachLine - what the coach said just before, for context ("did you?" -> "yes")
 * @param root0.ollamaUrl - base URL of the Ollama server
 * @param root0.transcript - what the user said out loud
 * @returns the actions to apply, empty when he said nothing actionable or the extraction failed
 */
export async function extractActions({ briefs, coachLine, ollamaUrl, transcript }: ExtractActionsOptions): Promise<CoachAction[]> {
  if (transcript.trim() === '') return []
  const input = `${describeTaskBriefs(briefs)}\n\nThe coach said: "${coachLine}"\nHe replied: "${transcript}"`
  const parsed = await askOllamaJson(ollamaUrl, extractorPrompt, input)
    .then(json => RawActionsSchema.safeParse(json))
    .catch((error: unknown) => {
      // never let the extractor break the conversation -- a turn without actions is still a turn
      logger.info('coach action extraction failed', error)
      return undefined
    })
  if (parsed === undefined || !parsed.success) return []
  const numbers = new Set(briefs.map(brief => brief.number))
  return parsed.data.actions.map(raw => toCoachAction(raw, numbers)).filter(action => action !== undefined)
}
