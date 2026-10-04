import { invariant } from 'es-toolkit'

/** mirrors `maxTaskTextLength` in `src/schemas/task.ts`, so the coach can't write a task the app would reject on import */
export const maxTaskTextLength = 150

/** a rhythm the recurrence math understands: an optional quantity, then a unit */
const rhythmRegex = /^(?:[1-9]\d{0,2}-?)?(?:day|week|month|year)s?$/u

/**
 * Read a string argument, ignoring anything the client sent that is not actually a string.
 * @param value - the raw argument value
 * @param fallback - what to use when the value is missing or not a string, defaults to empty
 * @returns the string value
 */
export function textArg(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

/**
 * Read a numeric argument, ignoring anything that is not a finite number.
 * @param value - the raw argument value
 * @param fallback - what to use when the value is missing or not a number
 * @returns the numeric value, never negative
 */
export function numberArg(value: unknown, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.max(0, value)
}

/**
 * Read a rhythm argument, refusing anything the app's recurrence math could not parse, which would
 * silently make the task due every day.
 * @param value - the raw argument value
 * @param fallback - what to use when the value is missing or not a string
 * @returns the validated rhythm, e.g. "day", "2-weeks" or "yes"
 */
export function rhythmArg(value: unknown, fallback: string) {
  const rhythm = textArg(value, fallback).trim()
  invariant(rhythm === 'yes' || rhythmRegex.test(rhythm), `"${rhythm}" is not a valid rhythm — use "day", "week", "month", "year", "2-days", "3-weeks", "2-months" and so on, or "yes" for a one-time task`)
  return rhythm
}

/**
 * Trim a text field to the app's own maximum length.
 * @param text - the raw text
 * @returns the text, capped
 */
export function capText(text: string) {
  return text.slice(0, maxTaskTextLength)
}

/**
 * Lowercase and strip accents, so "rangé" matches a spoken "range".
 * @param text - the text to normalize
 * @returns the normalized text
 */
export function normalize(text: string) {
  return text
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLowerCase()
}
