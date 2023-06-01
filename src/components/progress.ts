/* eslint-disable @typescript-eslint/no-magic-numbers */
import { dom, tw } from 'shuutils'
import { logger } from '../utils/logger'
import { state, watchState } from '../utils/state'
import { isTaskActive } from '../utils/tasks'

const progress = dom('hr', tw('app-progress mb-4 mt-1'))
progress.style.width = '0'

function counterText (percent = 0) {
  if (!percent) return 'Nothing done... yet'
  if (percent <= 25) return 'Amuse-bouche : check'
  if (percent <= 33) return 'Now we are talking'
  if (percent <= 50) return 'Halfway to heaven'
  if (percent <= 75) return 'Final chapter for today'
  if (percent < 100) return 'Lasts tasks remaining !'
  return 'You made it, well done dude :)'
}

async function emitHueColor (percent = 0) {
  const body = { on: true, hue: 0, sat: 255, bri: 255 } // eslint-disable-line @typescript-eslint/naming-convention
  if (percent <= 25) body.hue = 0
  else if (percent <= 50) body.hue = 5000
  else if (percent <= 75) body.hue = 20_000
  else body.bri = 0
  logger.info(`with a ${percent}% progress will emit hue color`, body)
  const response = await fetch(state.hueEndpoint, { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' }, method: 'PUT' })
  if (response.ok) logger.debug('emitted hue color successfully', response)
  else logger.error('emit hue color failed', response)
}

function showProgress () {
  const total = state.tasks.length
  const remaining = state.tasks.filter(task => isTaskActive(task)).length
  const percent = 100 - Math.round(remaining / total * 100)
  logger.info('show progress', { total, remaining, percent })
  progress.style.width = `${percent}%`
  document.body.dataset.progress = String(percent)
  state.statusProgress = counterText(percent)
  void emitHueColor(percent)
}

watchState('tasks', () => { showProgress() })

watchState('isSetup', () => { if (state.isSetup) showProgress() })

export { progress }
