import { Result } from 'shuutils'

/**
 * Fetches raw data from the specified URL, wrapped in a Result for safe error handling.
 * @param url the URL to fetch data from
 * @param options the request options to pass to the fetch API
 * @returns a promise that resolves to a Result containing the response or an error if the fetch fails
 */
export async function fetchRaw(url: string, options: RequestInit) {
  const result = await Result.trySafe(fetch(url, options))
  if (!result.ok) return Result.error(String(result.error))
  return result
}
