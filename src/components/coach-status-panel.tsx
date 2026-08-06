export type CoachStatus = 'checking' | 'done' | 'downloading' | 'error' | 'idle' | 'listening' | 'ready' | 'speaking' | 'thinking' | 'unsupported'

const percentMultiplier = 100

type CoachStatusPanelProps = {
  downloadProgress: number
  lastResponse: string
  lastTranscript: string
  status: CoachStatus
  stopAfterTurns: number
  turn: number
}

export function CoachStatusPanel({ downloadProgress, lastResponse, lastTranscript, status, stopAfterTurns, turn }: CoachStatusPanelProps) {
  if (status === 'checking') return <p data-testid="coach-browser-status">Checking model availability…</p>
  if (status === 'downloading') return <p data-testid="coach-browser-status">Downloading the on-device model… {downloadProgress > 0 ? `${Math.round(downloadProgress * percentMultiplier)}%` : ''}</p>
  if (status === 'ready') return <p data-testid="coach-browser-status">Model ready, starting…</p>
  if (status === 'listening')
    return (
      <p data-testid="coach-browser-status">
        Turn {turn}/{stopAfterTurns} — listening…
      </p>
    )
  if (status === 'thinking')
    return (
      <p data-testid="coach-browser-status">
        Turn {turn}/{stopAfterTurns} — thinking… {lastTranscript && <span className="text-white/50">(you said: &quot;{lastTranscript}&quot;)</span>}
      </p>
    )
  if (status === 'speaking')
    return (
      <p data-testid="coach-browser-status">
        Turn {turn}/{stopAfterTurns} — speaking: &quot;{lastResponse}&quot;
      </p>
    )
  if (status === 'error') return <p data-testid="coach-browser-status">Something went wrong, see the toast for details.</p>
  // oxlint-disable-next-line unicorn/no-null -- React empty-render convention, per CLAUDE.md
  return null
}
