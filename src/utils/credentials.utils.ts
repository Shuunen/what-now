import type { CredentialField } from './state.utils'

export function parseClipboard (clipboard: string) {
  // clipboard can contains something like : "appABC
  // patXYZ.123
  // https://zob.com"
  const regex = /"(?<apiBase>app\w+)\n(?<apiToken>pat[\w.]+)\n(?<hueEndpoint>http[^"]+)"/u
  const { apiBase = '', apiToken = '', hueEndpoint = '' } = regex.exec(clipboard)?.groups ?? {}
  return { apiBase, apiToken, hueEndpoint } satisfies Record<CredentialField, string>
}
