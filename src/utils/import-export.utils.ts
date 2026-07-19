import { dateIso10, nbSpacesIndent } from 'shuutils'
import type { AppData } from '../schemas/app-data'

/**
 * Build the filename used when exporting the whole app state.
 * @param date - the date to stamp the filename with, defaults to now
 * @returns the export filename @example "2025-01-26_what-now.json"
 */
export function exportFilename(date = new Date()) {
  return `${dateIso10(date)}_what-now.json`
}

/**
 * Serialize the whole app state to a pretty-printed JSON string.
 * @param data - the app data to serialize
 * @returns the JSON string
 */
export function exportJson(data: AppData) {
  return JSON.stringify(data, undefined, nbSpacesIndent)
}
