import { Button } from './ui/button'

type CoachSummaryPanelProps = {
  onRunAgain: () => void
  summaryLines: string[]
}

export function CoachSummaryPanel({ onRunAgain, summaryLines }: CoachSummaryPanelProps) {
  return (
    <div className="flex w-full max-w-2xl flex-col gap-3 text-left" data-testid="coach-browser-summary">
      <h3 className="text-center">Done — timing summary</h3>
      <pre className="max-h-96 overflow-auto rounded-md bg-black/30 p-3 text-xs whitespace-pre-wrap">{summaryLines.join('\n')}</pre>
      <Button className="mx-auto" name="Run again" onClick={onRunAgain}>
        Run again
      </Button>
    </div>
  )
}
