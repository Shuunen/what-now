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

/**
 * Returns a hue color based on the progress percentage, from red to green
 * @param percent the progress percentage
 * @returns the hue color between 0 (red) and 20000 (green)
 */
function getHueColor (percent = 0) {
  return Math.round(percent * 20_000 / 100)
}

async function emitHueColor (percent = 0) {
  const isEveryThingDone = percent === 100
  const body = { on: !isEveryThingDone, hue: getHueColor(percent), sat: 255, bri: 255 } // eslint-disable-line @typescript-eslint/naming-convention
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
