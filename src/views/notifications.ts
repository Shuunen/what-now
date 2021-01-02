import { emit, on, sleep } from 'shuutils'
import { img } from '../utils'

export const notification = img('https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/240/docomo/205/bell_1f514.png', 'fixed h-16 right-4 bottom-4 opacity-0 transition duration-300 ease-in-out cursor-pointer hover:opacity-80')

notification.addEventListener('click', () => {
  emit('ask-notification-perm')
  notification.classList.remove('opacity-60')
  notification.classList.add('opacity-0')
})

on('suggest-notification', async () => {
  await sleep(1000)
  notification.classList.remove('opacity-0')
  notification.classList.add('opacity-60')
})
