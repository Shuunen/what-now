import { dom, Nb, on } from 'shuutils'

const progress = dom('hr', 'mb-4')

function setProgress (percent = 0): void {
  progress.style.width = `${percent}%`
  document.body.dataset.progress = String(percent)
}

function counterText (total = 0, remaining = 0, percent = 0): string {
  const done = total - remaining
  if (done === Nb.None) return 'Nothing done... yet'
  if (percent <= Nb.Hundred * Nb.OneQuarter) return 'Amuse-bouche : check'
  if (percent <= Nb.Hundred * Nb.OneThird) return 'Now we are talking'
  if (percent <= Nb.Hundred * Nb.OneHalf) return 'Halfway to heaven'
  if (percent <= Nb.Hundred * Nb.FiveSixths) return `Final chapter, ${remaining} tasks remaining`
  if (percent < Nb.Hundred && remaining > Nb.One) return `Only ${remaining} tasks remaining`
  if (remaining === Nb.One) return 'Last task ^^'
  return 'You made it, well done dude :)'
}

function updateCounter (): void {
  const message = document.querySelector('.message')
  if (message === null) throw new Error('cannot update counter, failed to find the message element')
  const total = document.querySelectorAll('[data-task-id]').length
  const remaining = document.querySelectorAll('[data-active="true"]').length
  const percent = Nb.Hundred - Math.round(remaining / total * Nb.Hundred)
  message.classList.add('opacity-80', 'italic')
  message.textContent = counterText(total, remaining, percent)
  setProgress(percent)
}

on('update-counter', updateCounter)
setProgress(0)

export { progress }
