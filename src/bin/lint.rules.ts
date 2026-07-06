import fs from 'node:fs'
import path from 'node:path'

export type Rule = {
  check: () => boolean
  error: string
  name: string
}

const projectRoot = path.resolve(import.meta.dirname, '../..')

export function extractNonce(content: string): string | undefined {
  const match = /nonce[="'-]+(?<nonce>[A-Za-z0-9+/=_-]+)/u.exec(content)
  return match?.groups?.nonce
}

export function cspNonceMatches(): boolean {
  const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8')
  const headers = fs.readFileSync(path.join(projectRoot, 'public/_headers'), 'utf8')
  const htmlNonce = extractNonce(indexHtml)
  const headersNonce = extractNonce(headers)
  return htmlNonce !== undefined && htmlNonce === headersNonce
}

function listSourceFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    if (entry.name === 'bin') continue
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...listSourceFiles(fullPath))
    else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) files.push(fullPath)
  }
  return files
}

const monorepoImportRegex = /from ['"]@monorepo\//u

export function noMonorepoImports(): boolean {
  const srcDir = path.join(projectRoot, 'src')
  return listSourceFiles(srcDir).every(file => !monorepoImportRegex.test(fs.readFileSync(file, 'utf8')))
}

export const rules: Rule[] = [
  {
    check: cspNonceMatches,
    error: 'the CSP nonce in index.html must match the nonce in public/_headers',
    name: 'csp nonce consistency',
  },
  {
    check: noMonorepoImports,
    error: 'no source file under src/ should import from a @monorepo/* package, everything must be inlined',
    name: 'no monorepo imports',
  },
]
