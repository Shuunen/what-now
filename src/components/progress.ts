/* eslint-disable jsdoc/require-jsdoc */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { debounce, dom, tw } from 'shuutils'
import { logger } from '../utils/logger.utils'
import { state, watchState } from '../utils/state.utils'
import { isTaskActive } from '../utils/tasks.utils'

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

function getHueColorBody (percent = 0) {
  const isEveryThingDone = percent === 100
  const body = { bri: 255, hue: getHueColor(percent), on: !isEveryThingDone, sat: 255 } // eslint-disable-line @typescript-eslint/naming-convention
  logger.info(`with a ${percent}% progress will emit hue color`, body)
  return JSON.stringify(body)
}

// eslint-disable-next-line max-statements
async function emitHueColor (percent = 0) {
  if (state.hueEndpoint === '') { logger.info('no hue endpoint defined'); return }
  if (!state.isHomeNetwork) { logger.info('not in home network'); return }
  // eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/consistent-type-assertions
  const response = await fetch(state.hueEndpoint, { body: getHueColorBody(percent), headers: { 'Content-Type': 'application/json' }, method: 'PUT' }).catch((error: unknown) => ({ ok: false, reason: (error as Error).message }))
  if (response.ok) { logger.info('emitted hue color successfully', response); return }
  logger.error('emit hue color failed', response)
  const isUserOkToTest = confirm('Hue endpoint seems unreachable, do you want to test & authorize it ?') // eslint-disable-line no-alert
  if (isUserOkToTest) document.location.href = state.hueEndpoint
}

// eslint-disable-next-line max-statements, complexity
function getProgressBackground (percent = 0) {
  if (!state.isHomeNetwork) { logger.info('not in home network'); return 'from-gray-800 to-gray-900' }
  if (percent <= 10) return 'from-red-700 to-red-800'
  if (percent <= 20) return 'from-red-800 to-orange-700'
  if (percent <= 30) return 'from-orange-700 to-yellow-700'
  if (percent <= 40) return 'from-yellow-700 to-yellow-800'
  if (percent <= 50) return 'from-yellow-800 to-yellow-900'
  if (percent <= 60) return 'from-yellow-900 to-green-700'
  if (percent <= 70) return 'from-green-700 to-green-800'
  if (percent <= 80) return 'from-green-800 to-green-900'
  if (percent <= 90) return 'from-green-900 to-green-950'
  return 'from-green-950 to-green-950'
}

function showProgressBackground (percent = 0) {
  logger.info(`show progress background for ${percent}%`)
  const target = getProgressBackground(percent)
  // eslint-disable-next-line unicorn/no-keyword-prefix
  document.body.className = document.body.className.replace(/from-\w+-\d+ to-\w+-\d+/giu, target)
}

function showProgressSync () {
  const total = state.tasks.length
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  const remaining = state.tasks.filter(task => isTaskActive(task)).length
  const percent = 100 - Math.round(remaining / total * 100)
  logger.info('show progress', { percent, remaining, total })
  progress.style.width = `${percent}%`
  document.body.dataset.progress = String(percent)
  state.statusProgress = counterText(percent)
  showProgressBackground(percent)
  void emitHueColor(percent)
}

const showProgress = debounce(showProgressSync, 300)

// async function fakeProgress () {
//   for (let percent = 0; percent <= 100; percent += 10) {
//     showProgressBackground(percent)
//     await sleep(2000) // eslint-disable-line no-await-in-loop
//   }
// }

watchState('tasks', () => { void showProgress() })

watchState('isHomeNetwork', () => { void showProgress() })

watchState('isSetup', () => { if (state.isSetup) void showProgress() })

export { progress }
