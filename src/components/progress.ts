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

function showProgress () {
  const total = state.tasks.length
  const remaining = state.tasks.filter(task => isTaskActive(task)).length
  const percent = 100 - Math.round(remaining / total * 100)
  logger.info('show progress', { total, remaining, percent })
  progress.style.width = `${percent}%`
  document.body.dataset.progress = String(percent)
  state.statusProgress = counterText(percent)
}

watchState('tasks', () => { showProgress() })

watchState('isSetup', () => { if (state.isSetup) showProgress() })

export { progress }
