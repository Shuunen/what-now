import { dom, Nb, tw } from 'shuutils'
import { logger } from '../utils/logger'
import { state, watchState } from '../utils/state'
import { isTaskActive } from '../utils/tasks'

const progress = dom('hr', tw('app-progress mb-4 mt-1'))
progress.style.width = '0'

function counterText (percent = 0) {
  if (percent === Nb.None) return 'Nothing done... yet'
  if (percent <= Nb.Hundred * Nb.OneQuarter) return 'Amuse-bouche : check'
  if (percent <= Nb.Hundred * Nb.OneThird) return 'Now we are talking'
  if (percent <= Nb.Hundred * Nb.OneHalf) return 'Halfway to heaven'
  if (percent <= Nb.Hundred * Nb.FiveSixths) return 'Final chapter for today'
  if (percent < Nb.Hundred) return 'Lasts tasks remaining !'
  return 'You made it, well done dude :)'
}

function showProgress () {
  const total = state.tasks.length
  const remaining = state.tasks.filter(task => isTaskActive(task)).length
  const percent = Nb.Hundred - Math.round(remaining / total * Nb.Hundred)
  logger.info('show progress', { total, remaining, percent })
  progress.style.width = `${percent}%`
  document.body.dataset.progress = String(percent)
  state.statusProgress = counterText(percent)
}

watchState('tasks', () => { showProgress() })

watchState('isSetup', () => { if (state.isSetup) showProgress() })

export { progress }
