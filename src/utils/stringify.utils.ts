import { objectSerialize } from 'shuutils'

/**
 * Converts various data types to their string representation.
 * @param data the data to stringify
 * @returns the string representation of the data
 */
export function stringify(data: unknown) {
  if (data === undefined) return 'undefined'
  if (data === null) return 'null'
  if (typeof data === 'string') return data
  if (typeof data === 'object') return objectSerialize(data as Readonly<Record<string, unknown>>)
  // oxlint-disable-next-line typescript/no-base-to-string
  return String(data)
}
