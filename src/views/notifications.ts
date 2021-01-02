import { emit, on, sleep } from 'shuutils'
import { dom } from '../utils'

export const notification = dom('button', '🔔', 'fixed text-4xl right-6 bottom-6 opacity-0 transition animate-pulse duration-300 ease-in-out cursor-pointer')

notification.addEventListener('click', () => {
  emit('ask-notification-perm')
  notification.classList.add('hidden')
})

on('suggest-notification', async () => {
  await sleep(1000)
  notification.classList.add('opacity-80')
})
