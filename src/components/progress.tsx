import { debounce, nbHueMax } from 'shuutils'
import type { Task } from '../schemas/task'
import { useAppStore } from '../store/use-app-store'
import { fetchRaw } from '../utils/fetch.utils'
import { logger } from '../utils/logger.utils'
import { computeProgressPercent, webhookPayload } from '../utils/progress.utils'

async function emitToWebhook(webhook: string, tasks: Task[], progress: number) {
  const options = {
    body: webhookPayload(tasks, progress),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    method: 'POST',
    mode: 'no-cors',
  } as const
  const result = await fetchRaw(webhook, options)
  logger.info('webhook response', result)
}

function showProgressSync(webhook: string, tasks: Task[], percent: number) {
  if (document.body.dataset.progress === String(percent)) return
  logger.info('show progress', { percent })
  document.body.dataset.progress = String(percent)
  if (webhook !== '') void emitToWebhook(webhook, tasks, percent)
}

const showProgress = debounce(showProgressSync, nbHueMax)

export function Progress({ tasks }: { tasks: Task[] }) {
  const webhook = useAppStore(state => state.data.settings.webhook)
  // oxlint-disable-next-line unicorn/no-null
  if (tasks.length === 0) return null
  const percent = computeProgressPercent(tasks)
  showProgress(webhook, tasks, percent)
  return <div className="sr-only" data-testid="progress" style={{ width: `${percent}%` }} />
}
