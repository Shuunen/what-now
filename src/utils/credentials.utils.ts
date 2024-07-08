import type { CredentialField } from './state.utils'

/**
 * Parse clipboard
 * @param clipboard the clipboard content
 * @returns the parsed clipboard
 */
export function parseClipboard (clipboard: string) {
  // clipboard can contains something like : "appABC
  // patXYZ.123
  // https://zob.com"
  const regex = /"(?<apiBase>app\w+)\n(?<apiToken>pat[\w.]+)\n(?<hueEndpoint>http[^"]+)"/u
  // eslint-disable-next-line no-useless-assignment
  const { apiBase = '', apiToken = '', hueEndpoint = '' } = regex.exec(clipboard)?.groups ?? {}
  return { apiBase, apiToken, hueEndpoint } satisfies Record<CredentialField, string>
}
