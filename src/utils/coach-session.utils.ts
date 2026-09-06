import type { CoachLanguage } from '../components/coach-language-picker'
import type { Task } from '../schemas/task'
import { type CoachAction, extractActions } from './coach-actions.utils'
import { buildTaskBriefs, type CoachTaskBrief, closingDirective, findBriefTask, openingDirective, replyDirective, silenceDirective } from './coach-brief.utils'
import { languageConfigs } from './coach-language.utils'
import { listenOnce, primeMicrophonePermission, promptToText, speak } from './coach-speech.utils'
import { checkOllamaReachable, type CoachSession, createOllamaSession } from './ollama.utils'

/**
 * Runs the voice coach as a single open conversation about the whole task
 * list, rather than a scripted pass over one task at a time (see
 * src/pages/page-tasks.tsx for the React shell, which starts a session as soon
 * as there are active tasks -- no dedicated coach page or button).
 *
 * Each turn the model is handed the tasks that are still left and whatever the
 * user just said; it decides what to talk about, in what order, and how to
 * respond. What the app *does* -- completing a task, recording a reason,
 * setting one aside -- is read out of the exchange afterwards by
 * src/utils/coach-actions.utils.ts, so the user never has to say a magic word
 * and the coach never has to ask him to.
 *
 * Turn-based (speak -> listen -> speak) rather than a background always-on
 * listener -- docs/voice-coach-design.md's Pipecat spike found always-on
 * listening fights self-echo without real acoustic isolation, so each turn
 * opens a fresh listen window right after the coach finishes speaking.
 */

export type CoachStatus = 'checking' | 'done' | 'error' | 'idle' | 'listening' | 'speaking' | 'thinking'

export type CoachOutcomeKind = 'completed' | 'reason-added' | 'skipped'

export type CoachOutcome = {
  kind: CoachOutcomeKind
  taskName: string
}

export type CoachCallbacks = {
  onOutcome: (outcome: CoachOutcome) => void
  onResponse: (text: string) => void
  onStatusChange: (status: CoachStatus) => void
  onTaskChange: (task: Task | undefined) => void
  onTranscript: (text: string) => void
}

export type CoachTaskActions = {
  getTasks: () => Task[]
  markDone: (id: string) => void
  writeReason: (id: string, reason: string) => void
}

/** consecutive silent listens before the coach assumes he has walked away and bows out */
const maxSilentTurns = 3

/** hard ceiling on exchanges, so a model that never stops talking can't loop forever */
const maxTurns = 60

type SpeakTurnOptions = {
  callbacks: CoachCallbacks
  directive: string
  session: CoachSession
  speechLang: string
}

/**
 * Runs one coach turn: prompts the model with the directive, then speaks what
 * it answers.
 * @param root0 - the directive to prompt with, plus the session and callbacks for the turn
 * @param root0.callbacks - status/progress callbacks driving the page's UI
 * @param root0.directive - the briefing and instruction for this turn
 * @param root0.session - the running coach session
 * @param root0.speechLang - BCP-47 language code for TTS
 * @returns what the coach said, for the next turn's context
 */
async function speakTurn({ callbacks, directive, session, speechLang }: SpeakTurnOptions): Promise<string> {
  callbacks.onStatusChange('thinking')
  const response = await promptToText(session, directive)
  callbacks.onResponse(response)
  callbacks.onStatusChange('speaking')
  await speak(response, speechLang)
  return response
}

/**
 * Listens for the user's reply.
 * @param callbacks - status/progress callbacks driving the page's UI
 * @param speechLang - BCP-47 language code for STT
 * @returns what he said, empty when he stayed silent
 */
async function listenToUser(callbacks: CoachCallbacks, speechLang: string): Promise<string> {
  callbacks.onStatusChange('listening')
  const transcript = await listenOnce(speechLang)
  callbacks.onTranscript(transcript)
  return transcript.trim()
}

type ApplyActionsOptions = {
  actions: CoachTaskActions
  briefs: CoachTaskBrief[]
  callbacks: CoachCallbacks
  coachActions: CoachAction[]
  skipIds: Set<string>
}

/**
 * Applies what the extractor understood to the real task store.
 * @param root0 - the extracted actions, and the store/session state they act on
 * @param root0.actions - read/write access to the real task store
 * @param root0.briefs - the briefs the numbers refer to
 * @param root0.callbacks - status/progress callbacks driving the page's UI
 * @param root0.coachActions - the actions the extractor read out of the exchange
 * @param root0.skipIds - this session's set-aside list, mutated here
 * @returns a sentence describing what changed (empty when nothing did), and whether he wants to stop
 */
function applyActions({ actions, briefs, callbacks, coachActions, skipIds }: ApplyActionsOptions): { applied: string; shouldEnd: boolean } {
  const changes: string[] = []
  let shouldEnd = false
  for (const action of coachActions) {
    if (action.kind === 'end') {
      shouldEnd = true
      continue
    }
    const task = findBriefTask(briefs, action.number)
    if (!task) continue
    callbacks.onTaskChange(task)
    if (action.kind === 'complete') {
      actions.markDone(task.id)
      changes.push(`marked "${task.name}" as done`)
      callbacks.onOutcome({ kind: 'completed', taskName: task.name })
    } else if (action.kind === 'reason') {
      actions.writeReason(task.id, action.text)
      changes.push(`saved why "${task.name}" matters to him`)
      callbacks.onOutcome({ kind: 'reason-added', taskName: task.name })
    } else {
      skipIds.add(task.id)
      changes.push(`set "${task.name}" aside for today`)
      callbacks.onOutcome({ kind: 'skipped', taskName: task.name })
    }
  }
  return { applied: changes.length === 0 ? '' : `${changes.join(', ')}.`, shouldEnd }
}

export type RunCoachSessionOptions = {
  actions: CoachTaskActions
  callbacks: CoachCallbacks
  language: CoachLanguage
  /** base URL of the Ollama server, e.g. "http://localhost:11434" */
  ollamaUrl: string
}

type ConversationOptions = RunCoachSessionOptions & {
  session: CoachSession
  speechLang: string
}

type TurnState = {
  applied: string
  shouldEnd: boolean
  transcript: string
}

type ExchangeOptions = ConversationOptions & {
  briefs: CoachTaskBrief[]
  isOpening: boolean
  previous: TurnState
  skipIds: Set<string>
}

/**
 * Decides how the coming turn should be framed: the opening, a nudge after
 * silence, or a reply to what he just said.
 * @param root0 - the briefs for the coming turn, and how the previous one went
 * @param root0.briefs - the briefs for the coming turn
 * @param root0.isOpening - whether this is the first turn of the conversation
 * @param root0.previous - the previous turn's transcript and applied changes
 * @returns the directive to prompt the model with
 */
function nextDirective({ briefs, isOpening, previous }: Pick<ExchangeOptions, 'briefs' | 'isOpening' | 'previous'>): string {
  if (isOpening) return openingDirective(briefs)
  if (previous.transcript === '') return silenceDirective(briefs)
  return replyDirective(briefs, previous.transcript, previous.applied)
}

/**
 * Runs one full exchange: the coach speaks, he answers, and whatever he
 * implied is applied to the task store.
 * @param root0 - everything the exchange runs on
 * @param root0.actions - read/write access to the real task store
 * @param root0.briefs - the numbered briefs for this turn
 * @param root0.callbacks - status/progress callbacks driving the page's UI
 * @param root0.isOpening - whether this is the first turn of the conversation
 * @param root0.ollamaUrl - base URL of the Ollama server
 * @param root0.previous - the previous turn's transcript and applied changes
 * @param root0.session - the running coach session
 * @param root0.skipIds - this session's set-aside list, mutated here
 * @param root0.speechLang - BCP-47 language code for TTS/STT
 * @returns this turn's transcript, what was applied, and whether he wants to stop
 */
async function runExchange({ actions, briefs, callbacks, isOpening, ollamaUrl, previous, session, skipIds, speechLang }: ExchangeOptions): Promise<TurnState> {
  const directive = nextDirective({ briefs, isOpening, previous })
  const coachLine = await speakTurn({ callbacks, directive, session, speechLang })
  const transcript = await listenToUser(callbacks, speechLang)
  if (transcript === '') return { applied: '', shouldEnd: false, transcript }
  const coachActions = await extractActions({ briefs, coachLine, ollamaUrl, transcript })
  const { applied, shouldEnd } = applyActions({ actions, briefs, callbacks, coachActions, skipIds })
  return { applied, shouldEnd, transcript }
}

/**
 * Drives the conversation until he stops, goes quiet, or runs out of tasks.
 * Reads the task list fresh from `actions.getTasks` before every turn (rather
 * than a snapshot taken at session start) so a completion or a sync update
 * mid-conversation is reflected immediately, matching the store's own reactive
 * discipline elsewhere in the app.
 * @param options - everything the conversation runs on
 */
async function runConversation(options: ConversationOptions): Promise<void> {
  const { actions, callbacks, session, speechLang } = options
  const skipIds = new Set<string>()
  let previous: TurnState = { applied: '', shouldEnd: false, transcript: '' }
  let silentTurns = 0
  for (let turn = 0; turn < maxTurns; turn += 1) {
    const briefs = buildTaskBriefs(actions.getTasks(), skipIds)
    if (briefs.length === 0) break
    // eslint-disable-next-line no-await-in-loop -- turns are inherently sequential, each depends on the previous one's audio finishing
    previous = await runExchange({ ...options, briefs, isOpening: turn === 0, previous, skipIds })
    if (previous.shouldEnd) break
    silentTurns = previous.transcript === '' ? silentTurns + 1 : 0
    if (silentTurns >= maxSilentTurns) return
  }
  const remaining = buildTaskBriefs(actions.getTasks(), skipIds)
  await speakTurn({ callbacks, directive: closingDirective(remaining), session, speechLang })
}

/**
 * Runs a full coach session: checks the Ollama server, opens a conversation
 * about today's tasks, and closes it when he is done.
 * @param root0 - the callbacks, language, task actions, and Ollama endpoint driving this session
 * @param root0.actions - read/write access to the real task store
 * @param root0.callbacks - status/progress callbacks driving the page's UI
 * @param root0.language - which language config to run the coach in
 * @param root0.ollamaUrl - base URL of the Ollama server, e.g. "http://localhost:11434"
 */
export async function runCoachSession({ actions, callbacks, language, ollamaUrl }: RunCoachSessionOptions): Promise<void> {
  await primeMicrophonePermission()
  callbacks.onStatusChange('checking')
  await checkOllamaReachable(ollamaUrl)
  const { speechLang, systemPrompt } = languageConfigs[language]
  const session = createOllamaSession(ollamaUrl, systemPrompt)
  try {
    await runConversation({ actions, callbacks, language, ollamaUrl, session, speechLang })
  } finally {
    session.destroy()
    callbacks.onTaskChange(undefined)
    callbacks.onStatusChange('done')
  }
}
