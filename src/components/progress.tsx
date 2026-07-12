import { debounce, nbHueMax } from 'shuutils'
import type { Task } from '../types'
import { fetchRaw } from '../utils/fetch.utils'
import { logger } from '../utils/logger.utils'
import { computeProgressPercent, webhookPayload } from '../utils/progress.utils'
import { state } from '../utils/state.utils'

function counterText(percent = 0) {
  /* oxlint-disable no-magic-numbers */
  if (!percent) return 'Nothing done... yet'
  if (percent <= 25) return 'Amuse-bouche : check'
  if (percent <= 33) return 'Now we are talking'
  if (percent <= 50) return 'Halfway to heaven'
  if (percent <= 75) return 'Final chapter for today'
  if (percent < 100) return 'Lasts tasks remaining !'
  return 'You made it, well done dude :)'
  /* oxlint-enable no-magic-numbers */
}

async function emitToWebhook(progress: number) {
  const options = {
    body: webhookPayload(progress),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    method: 'POST',
    mode: 'no-cors',
  } as const
  const result = await fetchRaw(state.webhook, options)
  logger.info('webhook response', result)
}

function showProgressSync(percent: number) {
  if (document.body.dataset.progress === String(percent)) return
  logger.info('show progress', { percent })
  document.body.dataset.progress = String(percent)
  state.statusProgress = counterText(percent)
  if (state.webhook !== '') void emitToWebhook(percent)
}

const showProgress = debounce(showProgressSync, nbHueMax)

export function Progress({ tasks }: { tasks: Task[] }) {
  // oxlint-disable-next-line unicorn/no-null
  if (tasks.length === 0) return null
  const percent = computeProgressPercent(tasks)
  showProgress(percent)
  return <div className="sr-only" data-testid="progress" style={{ width: `${percent}%` }} />
}
