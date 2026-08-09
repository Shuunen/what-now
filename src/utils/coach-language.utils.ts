import type { CoachLanguage } from '../components/coach-language-picker'
import type { Task } from '../schemas/task'
import { byActive, isTaskActive } from './tasks.utils'

/**
 * Per-language coach config (system prompt, clarify phrase, BCP-47 speech
 * codes) and the keyword-based intent classifier -- split out of
 * src/utils/coach-session.utils.ts purely to keep that file under the
 * project's max-lines lint bound.
 */

export type CoachIntent = 'another' | 'delay' | 'done' | 'snooze' | 'unclear'

export type LanguageConfig = {
  clarifyPhrase: string
  // BCP-47 code for SpeechRecognition.lang / SpeechSynthesisUtterance.lang.
  speechLang: string
  systemPrompt: string
}

// modelLanguageCode is the bare ISO 639-1 code LanguageModel's
// expectedInputs/expectedOutputs wants (console warning if omitted:
// "specify a supported output language code: [de, en, es, fr, ja]").
export const languageConfigs: Record<CoachLanguage, LanguageConfig> = {
  en: {
    clarifyPhrase: "Sorry, I didn't catch that -- say done, delay, another, or snooze.",
    speechLang: 'en-US',
    systemPrompt: `You are a warm, encouraging voice coach for the What Now task app.
Each turn I will describe the current task. Two kinds of turns happen:
1. If I say the reason is missing, warmly ask why this task matters to the user, in one short question.
2. Otherwise I'll give you the task name and its reason -- announce both in one short sentence, then ask if the user is ready to do it now, wants to delay it, wants another task instead, or already did it.
Keep every response to at most 2 short sentences -- this is spoken aloud. Never use emojis or symbols -- your response is read aloud by text-to-speech, which would speak them out.`,
  },
  fr: {
    clarifyPhrase: "Désolé, je n'ai pas compris -- dis fait, plus tard, autre, ou occupé.",
    speechLang: 'fr-FR',
    systemPrompt: `Tu es un coach vocal chaleureux et encourageant pour l'application de tâches What Now. Tu dois toujours répondre en français.
À chaque tour je décris la tâche en cours. Deux types de tours existent :
1. Si je dis que la raison manque, demande chaleureusement pourquoi cette tâche compte pour l'utilisateur, en une courte question.
2. Sinon, je te donne le nom de la tâche et sa raison (en anglais -- traduis-les en français, ne les répète jamais en anglais) -- annonce les deux en une phrase courte, puis demande si la personne est prête à la faire maintenant, veut la reporter, veut une autre tâche, ou l'a déjà faite.
Chaque réponse doit tenir en 2 phrases courtes maximum -- c'est prononcé à voix haute. N'utilise jamais d'emojis ni de symboles -- ta réponse est lue à voix haute par synthèse vocale, qui les prononcerait.`,
  },
}

export const modelLanguageCodes: Record<CoachLanguage, string> = { en: 'en', fr: 'fr' }

const intentKeywords: Record<CoachLanguage, Record<Exclude<CoachIntent, 'unclear'>, RegExp>> = {
  en: {
    another: /\b(?<match>another|different|skip|next)\b/iu,
    delay: /\b(?<match>delay|later|tomorrow|not now)\b/iu,
    done: /\b(?<match>done|did it|finished|completed|already)\b/iu,
    snooze: /\b(?<match>snooze|busy|away)\b/iu,
  },
  // \b relies on ASCII \w, which doesn't treat accented letters as word characters -- a keyword
  // ending in one (e.g. "occupé") would then fail its trailing boundary, since the transition from
  // a non-word 'é' to end-of-string/space is not a word/non-word boundary. Unicode-aware
  // lookaround (?<![\p{L}])...(?![\p{L}]) works for both accented and plain keywords.
  fr: {
    another: /(?<![\p{L}])(?<match>autre|suivant|passe)(?![\p{L}])/iu,
    delay: /(?<![\p{L}])(?<match>plus tard|demain|reporte)(?![\p{L}])/iu,
    done: /(?<![\p{L}])(?<match>fait|termine|termin[ée]|d[ée]j[àa] fait)(?![\p{L}])/iu,
    snooze: /(?<![\p{L}])(?<match>occupe|occup[ée]|pas maintenant)(?![\p{L}])/iu,
  },
}

/**
 * Classifies a transcript into a coach intent via keyword matching -- a
 * lightweight, deterministic guard in front of the free-form LLM path
 * (see docs/voice-coach-design.md's "unresolved decisions": this resolves
 * that question in favor of the guard, since it's more reliable than
 * relying on a small on-device model's JSON classification alone).
 * @param transcript - the recognized speech
 * @param language - which keyword set to match against
 * @returns the matched intent, or "unclear" when nothing matches
 */
export function classifyIntent(transcript: string, language: CoachLanguage): CoachIntent {
  const keywords = intentKeywords[language]
  if (keywords.done.test(transcript)) return 'done'
  if (keywords.delay.test(transcript)) return 'delay'
  if (keywords.snooze.test(transcript)) return 'snooze'
  if (keywords.another.test(transcript)) return 'another'
  return 'unclear'
}

/**
 * Picks the next task the coach should offer: the first active task not
 * already skipped this session (delayed/snoozed/skipped-for-another).
 * @param tasks - the full task list
 * @param skipIds - ids to exclude, accumulated during this session
 * @returns the next task to offer, or undefined when the queue is empty
 */
export function pickNextTask(tasks: Task[], skipIds: Set<string>): Task | undefined {
  return tasks.filter(task => isTaskActive(task) && !skipIds.has(task.id)).toSorted(byActive)[0]
}
