import { dom, emit, on, sleep } from 'shuutils'
import { numbers } from '../utils'

const notification = dom('button', 'fixed text-4xl right-6 top-6 opacity-0 transition duration-300 ease-in-out cursor-pointer', '🔔')

notification.addEventListener('click', () => {
  emit('ask-notification-perm')
  notification.classList.add('hidden')
})

on('suggest-notification', async () => {
  await sleep(numbers.secondInMs)
  notification.classList.add('opacity-80', 'animate-pulse')
})

export { notification }
