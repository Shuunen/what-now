/**
 * Per-step timing instrumentation for the browser voice coach experiment,
 * mirroring coach/server/timing.py's event taxonomy so the two can be
 * compared directly: listening, speech-to-text, agent query, text-to-speech,
 * playback. Browser Web Speech API collapses "speech-to-text" into the same
 * moment as "listening stop" (no separate segmentation step like Whisper),
 * and collapses "text-to-speech synthesis" into the same moment as "audio
 * playback" (no separate synth-then-play step like Kokoro) -- both are
 * flagged explicitly in the summary rather than silently reported as ~0s.
 */

export type TimingStepLabel = 'agent_first_token' | 'agent_query_start' | 'agent_query_stop' | 'listening_start' | 'listening_stop' | 'model_ready' | 'playing_start' | 'playing_stop' | 'stt_stop' | 'tts_start' | 'tts_stop'

export type TimingEventRecord = {
  label: TimingStepLabel
  seconds: number
  turn: number
}

const separatorWidth = 72
const millisecondsPerSecond = 1000
const timeColumnWidth = 7
const decimalPlaces = 3
const deltaColumnWidth = 6
const turnColumnWidth = 2
const maxLongestStepsShown = 10

const stepDefinitions: { end: TimingStepLabel; name: string; start: TimingStepLabel }[] = [
  { end: 'listening_stop', name: 'listening (user speaking)', start: 'listening_start' },
  { end: 'stt_stop', name: 'speech-to-text', start: 'listening_stop' },
  { end: 'agent_first_token', name: 'agent time-to-first-token', start: 'agent_query_start' },
  { end: 'agent_query_stop', name: 'agent full response', start: 'agent_query_start' },
  { end: 'tts_stop', name: 'text-to-speech synthesis', start: 'tts_start' },
  { end: 'playing_stop', name: 'audio playback', start: 'playing_start' },
  { end: 'agent_query_start', name: 'gap: stt done -> agent query start', start: 'stt_stop' },
  { end: 'tts_start', name: 'gap: agent done -> tts start', start: 'agent_query_stop' },
]

const separatorLine = '='.repeat(separatorWidth)

function padTime(value: number): string {
  return value.toFixed(decimalPlaces).padStart(timeColumnWidth)
}

function buildTimelineLines(events: TimingEventRecord[]): string[] {
  const lines: string[] = [separatorLine, 'TIMELINE', separatorLine]
  let previousSeconds = 0
  for (const event of events) {
    const delta = event.seconds - previousSeconds
    lines.push(`  t=${padTime(event.seconds)}s  (+${delta.toFixed(decimalPlaces).padStart(deltaColumnWidth)}s)  turn=${event.turn}  ${event.label}`)
    previousSeconds = event.seconds
  }
  return lines
}

function groupEventsByTurn(events: TimingEventRecord[]): Map<number, Map<TimingStepLabel, number>> {
  const byTurn = new Map<number, Map<TimingStepLabel, number>>()
  for (const event of events) {
    const labels = byTurn.get(event.turn) ?? new Map<TimingStepLabel, number>()
    labels.set(event.label, event.seconds)
    byTurn.set(event.turn, labels)
  }
  return byTurn
}

function durationsForTurn(labels: Map<TimingStepLabel, number>): { duration: number; name: string }[] {
  const durations: { duration: number; name: string }[] = []
  for (const { end, name, start } of stepDefinitions) {
    const startSeconds = labels.get(start)
    const endSeconds = labels.get(end)
    if (startSeconds === undefined || endSeconds === undefined) continue
    const duration = endSeconds - startSeconds
    if (duration >= 0) durations.push({ duration, name })
  }
  return durations
}

function buildStepDurationLines(byTurn: Map<number, Map<TimingStepLabel, number>>): { allDurations: { duration: number; name: string; turn: number }[]; lines: string[] } {
  const lines: string[] = ['', separatorLine, 'STEP DURATIONS (per turn, longest first)', separatorLine]
  const allDurations: { duration: number; name: string; turn: number }[] = []
  const sortedTurns = [...byTurn.entries()].toSorted(([turnA], [turnB]) => turnA - turnB)
  for (const [turn, labels] of sortedTurns) {
    if (turn === 0) continue // model_ready fires before any turn
    lines.push(`\n  Turn ${turn}:`)
    const turnDurations = durationsForTurn(labels)
    for (const entry of turnDurations) allDurations.push({ ...entry, turn })
    const sortedTurnDurations = turnDurations.toSorted((durationA, durationB) => durationB.duration - durationA.duration)
    for (const { duration, name } of sortedTurnDurations) lines.push(`    ${padTime(duration)}s  ${name}`)
  }
  return { allDurations, lines }
}

function buildLongestStepsLines(allDurations: { duration: number; name: string; turn: number }[]): string[] {
  if (allDurations.length === 0) return []
  const lines: string[] = ['', separatorLine, 'LONGEST STEPS ACROSS THE WHOLE SESSION', separatorLine]
  const sorted = allDurations.toSorted((durationA, durationB) => durationB.duration - durationA.duration).slice(0, maxLongestStepsShown)
  for (const { duration, name, turn } of sorted) lines.push(`  ${padTime(duration)}s  turn ${String(turn).padStart(turnColumnWidth)}  ${name}`)
  return lines
}

export class BrowserTimingLog {
  public events: TimingEventRecord[] = []
  private firstTokenSeenThisTurn = false
  private readonly scriptStart: number
  private turn = 0

  public constructor(scriptStart: number) {
    this.scriptStart = scriptStart
  }

  /**
   * Records a timestamped step event, tagged with the current turn number.
   * A "listening_start" event begins a new turn.
   * @param label - which step this event marks
   * @returns the recorded event
   */
  public record(label: TimingStepLabel): TimingEventRecord {
    if (label === 'listening_start') {
      this.turn += 1
      this.firstTokenSeenThisTurn = false
    }
    const seconds = (performance.now() - this.scriptStart) / millisecondsPerSecond
    const event: TimingEventRecord = { label, seconds, turn: this.turn }
    this.events.push(event)
    console.log(`[timing] t=${seconds.toFixed(decimalPlaces)}s turn=${this.turn} ${label}`)
    return event
  }

  /**
   * Records the first agent response chunk of the current turn, ignoring
   * subsequent chunks -- mirrors coach/server/timing.py's dedup logic for
   * "agent_first_token".
   */
  public recordFirstTokenOnce(): void {
    if (this.firstTokenSeenThisTurn) return
    this.firstTokenSeenThisTurn = true
    this.record('agent_first_token')
  }

  /**
   * Builds the full printable summary: chronological timeline, per-turn
   * step durations sorted longest-first, and the longest steps across the
   * whole session -- same structure as coach/server/timing.py's
   * `print_summary`, returned as lines instead of printed directly so the
   * page can both log and render it.
   * @returns the summary as an array of printable lines
   */
  public summaryLines(): string[] {
    if (this.events.length === 0) return ['[timing] no events recorded']

    const byTurn = groupEventsByTurn(this.events)
    const { allDurations, lines: stepDurationLines } = buildStepDurationLines(byTurn)

    return [...buildTimelineLines(this.events), ...stepDurationLines, ...buildLongestStepsLines(allDurations), separatorLine]
  }
}
