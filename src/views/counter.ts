import { dom, on } from 'shuutils'

export const progress = dom('hr', 'mb-4')

const setProgress = (percent = 0): void => {
  progress.style.width = `${percent}%`
  document.body.dataset['progress'] = `${percent}`
}

const counterText = (total = 0, remaining = 0, percent = 0): string => {
  const done = total - remaining
  if (done === 0) return 'Nothing done... yet'
  if (percent <= 25) return 'Amuse-bouche : check'
  if (percent <= 45) return 'Now we are talking'
  if (percent <= 55) return 'Halfway to heaven'
  if (percent <= 85) return `Final chapter, ${remaining} tasks remaining`
  if (percent < 100 && remaining > 1) return `Only ${remaining} tasks remaining`
  if (remaining === 1) return 'Last task ^^'
  return 'You made it, well done dude :)'
}

const updateCounter = (): void => {
  const message = document.querySelector('.message')
  if (message === null) return console.error('cannot update counter, failed to find the message element')
  const total = document.querySelectorAll('[data-task-id]').length
  const remaining = document.querySelectorAll('[data-active="true"]').length
  const percent = 100 - Math.round(remaining / total * 100)
  message.classList.add('opacity-80', 'italic')
  message.textContent = counterText(total, remaining, percent)
  setProgress(percent)
}

on('update-counter', updateCounter)
setProgress(0)
