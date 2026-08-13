import { invariant, isNil } from 'es-toolkit'
import type { CoachLanguage } from '../components/coach-language-picker'
import { maxTaskTextLength, type Task } from '../schemas/task'
import { classifyIntent, type CoachIntent, languageConfigs, pickNextTask } from './coach-language.utils'
import { listenOnce, primeMicrophonePermission, promptToText, speak } from './coach-speech.utils'
import { checkOllamaReachable, type CoachSession, createOllamaSession } from './ollama.utils'

/**
 * Orchestrates a real voice coach session against the actual task queue (see
 * src/pages/page-tasks.tsx for the React shell, which starts a session as
 * soon as there are active tasks -- no dedicated coach page or button): Web
 * Speech API (STT + TTS) and a local Ollama server for the model backend
 * (see src/utils/ollama.utils.ts). Turn-based (announce -> listen -> act ->
 * next task) rather than a background always-on listener --
 * docs/voice-coach-design.md's Pipecat spike found always-on listening
 * fights self-echo without real acoustic isolation, and this app isn't a
 * dedicated must-stay-open tab, so each turn opens a fresh listen window
 * right after the coach finishes speaking instead.
 */

export type CoachStatus = 'checking' | 'done' | 'error' | 'idle' | 'listening' | 'speaking' | 'thinking'

export type CoachOutcomeKind = 'answered-reason' | 'delayed' | 'done' | 'skipped' | 'snoozed'

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

/**
 * Checks that the configured Ollama server is reachable, then creates a
 * chat session against it.
 * @param callbacks - status/progress callbacks driving the page's UI
 * @param language - the coach's language, drives the system prompt
 * @param ollamaUrl - base URL of the Ollama server, e.g. "http://localhost:11434"
 * @returns the created session
 */
async function createCoachSession(callbacks: CoachCallbacks, language: CoachLanguage, ollamaUrl: string): Promise<CoachSession> {
  callbacks.onStatusChange('checking')
  await checkOllamaReachable(ollamaUrl)
  return createOllamaSession(ollamaUrl, languageConfigs[language].systemPrompt)
}

type RunReasonTurnOptions = {
  callbacks: CoachCallbacks
  session: CoachSession
  speechLang: string
  task: Task
}

/**
 * Runs a single "ask for the missing reason" turn: prompts the model to ask
 * why the task matters, speaks it, listens for the answer, and returns the
 * raw transcript (clamped to the schema's text length bound).
 * @param root0 - the running session, current task, and callbacks needed for this turn
 * @param root0.callbacks - status/progress callbacks driving the page's UI
 * @param root0.session - the running coach session
 * @param root0.speechLang - BCP-47 language code for TTS/STT
 * @param root0.task - the task missing a reason
 * @returns the user's spoken answer, clamped to the schema's text length bound
 */
async function runReasonTurn({ callbacks, session, speechLang, task }: RunReasonTurnOptions): Promise<string> {
  callbacks.onStatusChange('thinking')
  const response = await promptToText(session, `Current task: "${task.name}". No reason is set yet. Ask why this task matters.`)
  callbacks.onResponse(response)

  callbacks.onStatusChange('speaking')
  await speak(response, speechLang)

  callbacks.onStatusChange('listening')
  const transcript = await listenOnce(speechLang)
  callbacks.onTranscript(transcript)
  return transcript.trim().slice(0, maxTaskTextLength)
}

type RunAnnounceTurnOptions = {
  callbacks: CoachCallbacks
  clarifyPhrase: string
  language: CoachLanguage
  session: CoachSession
  speechLang: string
  task: Task
}

/**
 * Runs a single "announce the task, ask what to do" turn: prompts the model,
 * speaks its response, listens, and classifies the reply into an intent --
 * retrying the listen once with a clarifying phrase if the first reply
 * doesn't match any known intent.
 * @param root0 - the running session, current task, and callbacks/language needed for this turn
 * @param root0.callbacks - status/progress callbacks driving the page's UI
 * @param root0.clarifyPhrase - spoken once, if the first reply doesn't match a known intent
 * @param root0.language - which keyword set to classify the reply against
 * @param root0.session - the running coach session
 * @param root0.speechLang - BCP-47 language code for TTS/STT
 * @param root0.task - the task being announced
 * @returns the classified intent -- may still be "unclear" after the retry, which callers treat
 *   as "skip this task for now"
 */
async function runAnnounceTurn({ callbacks, clarifyPhrase, language, session, speechLang, task }: RunAnnounceTurnOptions): Promise<CoachIntent> {
  invariant(task.reason, 'runAnnounceTurn requires a task with a reason -- runOneTask routes reason-less tasks to runReasonTurn instead')
  callbacks.onStatusChange('thinking')
  const response = await promptToText(session, `Current task: "${task.name}" (reason: "${task.reason}"). Announce it and ask if ready, delay, another, or done.`)
  callbacks.onResponse(response)

  callbacks.onStatusChange('speaking')
  await speak(response, speechLang)

  callbacks.onStatusChange('listening')
  const transcript = await listenOnce(speechLang)
  callbacks.onTranscript(transcript)
  const intent = classifyIntent(transcript, language)
  if (intent !== 'unclear') return intent

  callbacks.onStatusChange('speaking')
  await speak(clarifyPhrase, speechLang)
  callbacks.onStatusChange('listening')
  const retryTranscript = await listenOnce(speechLang)
  callbacks.onTranscript(retryTranscript)
  return classifyIntent(retryTranscript, language)
}

export type CoachTaskActions = {
  getTasks: () => Task[]
  markDone: (id: string) => void
  writeReason: (id: string, reason: string) => void
}

type RunOneTaskOptions = {
  actions: CoachTaskActions
  callbacks: CoachCallbacks
  clarifyPhrase: string
  language: CoachLanguage
  session: CoachSession
  skipIds: Set<string>
  speechLang: string
  task: Task
}

/**
 * Runs a single task through the coach: asks for its missing reason, or
 * announces it and acts on the user's spoken intent (marking it done,
 * adding it to this session's skip list, or leaving it for the next pass).
 * @param root0 - the task to run, the running session, and the skip-list/actions to mutate
 * @param root0.actions - read/write access to the real task store
 * @param root0.callbacks - status/progress callbacks driving the page's UI
 * @param root0.clarifyPhrase - spoken once, if the announce turn's first reply doesn't match a known intent
 * @param root0.language - which keyword set to classify replies against
 * @param root0.session - the running coach session
 * @param root0.skipIds - this session's skip list, mutated when the task isn't marked done
 * @param root0.speechLang - BCP-47 language code for TTS/STT
 * @param root0.task - the task to run
 * @returns the outcome recorded for this task
 */
async function runOneTask({ actions, callbacks, clarifyPhrase, language, session, skipIds, speechLang, task }: RunOneTaskOptions): Promise<CoachOutcome> {
  if (isNil(task.reason) || task.reason === '') {
    const reason = await runReasonTurn({ callbacks, session, speechLang, task })
    if (reason.length > 0) actions.writeReason(task.id, reason)
    return { kind: 'answered-reason', taskName: task.name }
  }

  const intent = await runAnnounceTurn({ callbacks, clarifyPhrase, language, session, speechLang, task })
  if (intent === 'done') {
    actions.markDone(task.id)
    return { kind: 'done', taskName: task.name }
  }
  skipIds.add(task.id)
  if (intent === 'delay') return { kind: 'delayed', taskName: task.name }
  if (intent === 'snooze') return { kind: 'snoozed', taskName: task.name }
  return { kind: 'skipped', taskName: task.name }
}

export type RunCoachSessionOptions = {
  actions: CoachTaskActions
  callbacks: CoachCallbacks
  language: CoachLanguage
  /** base URL of the Ollama server, e.g. "http://localhost:11434" */
  ollamaUrl: string
}

/**
 * Runs the full coach session: creates the model session, then repeatedly
 * picks the next active task and hands it to `runOneTask`, until the queue
 * is empty. Reads the task list fresh from `actions.getTasks` every turn
 * (rather than a snapshot taken at session start) so a completion or a sync
 * update mid-session is reflected immediately, matching the store's own
 * reactive-subscription discipline elsewhere in the app.
 * @param root0 - the callbacks, language, task actions, and Ollama endpoint driving this session
 * @param root0.actions - read/write access to the real task store
 * @param root0.callbacks - status/progress callbacks driving the page's UI
 * @param root0.language - which language config to run the coach in
 * @param root0.ollamaUrl - base URL of the Ollama server, e.g. "http://localhost:11434"
 * @returns the outcomes recorded this session, in order
 */
export async function runCoachSession({ actions, callbacks, language, ollamaUrl }: RunCoachSessionOptions): Promise<CoachOutcome[]> {
  await primeMicrophonePermission()
  const session = await createCoachSession(callbacks, language, ollamaUrl)
  const { clarifyPhrase, speechLang } = languageConfigs[language]
  const outcomes: CoachOutcome[] = []
  const skipIds = new Set<string>()

  for (;;) {
    const task = pickNextTask(actions.getTasks(), skipIds)
    callbacks.onTaskChange(task)
    if (!task) break

    // eslint-disable-next-line no-await-in-loop -- turns are inherently sequential, each depends on the previous one's audio finishing
    const outcome = await runOneTask({ actions, callbacks, clarifyPhrase, language, session, skipIds, speechLang, task })
    outcomes.push(outcome)
    callbacks.onOutcome(outcome)
  }

  session.destroy()
  callbacks.onTaskChange(undefined)
  callbacks.onStatusChange('done')
  return outcomes
}
