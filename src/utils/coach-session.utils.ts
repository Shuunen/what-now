import { invariant, isNil } from 'es-toolkit'
import type { CoachLanguage } from '../components/coach-language-picker'
import { maxTaskTextLength, type Task } from '../schemas/task'
import { classifyIntent, type CoachIntent, languageConfigs, modelLanguageCodes, pickNextTask } from './coach-language.utils'
import { listenOnce, primeMicrophonePermission, promptToText, speak } from './coach-speech.utils'

/**
 * Orchestrates a real voice coach session against the actual task queue (see
 * src/pages/page-tasks.tsx for the React shell, which starts a session as
 * soon as there are active tasks -- no dedicated coach page or button): Web
 * Speech API (STT + TTS) and Chrome's on-device Prompt API (LanguageModel /
 * Gemini Nano). Turn-based (announce -> listen -> act -> next task) rather
 * than a background always-on listener -- docs/voice-coach-design.md's
 * Pipecat spike found always-on listening fights self-echo without real
 * acoustic isolation, and this app isn't a dedicated must-stay-open tab, so
 * each turn opens a fresh listen window right after the coach finishes
 * speaking instead.
 */

export type CoachStatus = 'checking' | 'done' | 'downloading' | 'error' | 'idle' | 'listening' | 'speaking' | 'thinking'

export type CoachOutcomeKind = 'answered-reason' | 'delayed' | 'done' | 'skipped' | 'snoozed'

export type CoachOutcome = {
  kind: CoachOutcomeKind
  taskName: string
}

export type CoachCallbacks = {
  onDownloadProgress: (loaded: number) => void
  onOutcome: (outcome: CoachOutcome) => void
  onResponse: (text: string) => void
  onStatusChange: (status: CoachStatus) => void
  onTaskChange: (task: Task | undefined) => void
  onTranscript: (text: string) => void
}

/**
 * Checks model availability and creates a LanguageModel session, reporting
 * download progress via `callbacks` if the model needs downloading first.
 * @param callbacks - status/progress callbacks driving the page's UI
 * @param language - the coach's language, drives the system prompt and the
 *   model's expectedInputs/expectedOutputs (Chrome warns and may degrade
 *   output quality if this isn't specified -- supported codes: de, en, es, fr, ja)
 * @returns the created session
 */
async function createCoachSession(callbacks: CoachCallbacks, language: CoachLanguage): Promise<LanguageModelSession> {
  callbacks.onStatusChange('checking')
  const modelLanguageCode = modelLanguageCodes[language]
  const availability = await globalThis.window.LanguageModel?.availability({
    expectedInputs: [{ languages: [modelLanguageCode], type: 'text' }],
    expectedOutputs: [{ languages: [modelLanguageCode], type: 'text' }],
  })
  invariant(availability, 'LanguageModel.availability() returned nothing')
  invariant(availability !== 'unavailable', 'This device cannot run the on-device model (unavailable).')

  if (availability !== 'available') callbacks.onStatusChange('downloading')
  const session = await globalThis.window.LanguageModel?.create({
    expectedInputs: [{ languages: [modelLanguageCode], type: 'text' }],
    expectedOutputs: [{ languages: [modelLanguageCode], type: 'text' }],
    initialPrompts: [{ content: languageConfigs[language].systemPrompt, role: 'system' }],
    monitor(monitor) {
      monitor.addEventListener('downloadprogress', event => {
        callbacks.onDownloadProgress(event.loaded)
      })
    },
  })
  invariant(session, 'LanguageModel.create() returned nothing')
  return session
}

type RunReasonTurnOptions = {
  callbacks: CoachCallbacks
  session: LanguageModelSession
  speechLang: string
  task: Task
}

/**
 * Runs a single "ask for the missing reason" turn: prompts the model to ask
 * why the task matters, speaks it, listens for the answer, and returns the
 * raw transcript (clamped to the schema's text length bound).
 * @param root0 - the running session, current task, and callbacks needed for this turn
 * @param root0.callbacks - status/progress callbacks driving the page's UI
 * @param root0.session - the running LanguageModel session
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
  session: LanguageModelSession
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
 * @param root0.session - the running LanguageModel session
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
  session: LanguageModelSession
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
 * @param root0.session - the running LanguageModel session
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

/**
 * Runs the full coach session: creates the model session, then repeatedly
 * picks the next active task and hands it to `runOneTask`, until the queue
 * is empty. Reads the task list fresh from `actions.getTasks` every turn
 * (rather than a snapshot taken at session start) so a completion or a sync
 * update mid-session is reflected immediately, matching the store's own
 * reactive-subscription discipline elsewhere in the app.
 * @param callbacks - status/progress callbacks driving the page's UI
 * @param language - which language config to run the coach in
 * @param actions - read/write access to the real task store
 * @returns the outcomes recorded this session, in order
 */
export async function runCoachSession(callbacks: CoachCallbacks, language: CoachLanguage, actions: CoachTaskActions): Promise<CoachOutcome[]> {
  await primeMicrophonePermission()
  const session = await createCoachSession(callbacks, language)
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
