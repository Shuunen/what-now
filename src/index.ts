import { emit, on } from 'shuutils'
import { idle, worker } from './services'
import { preventDeprecatedData } from './utils'
import { landing, notification } from './views'

const app = document.querySelector('#app')

if (app) {
  app.className = 'flex flex-col min-h-full items-center justify-center p-6 bg-gray-900 text-blue-100'
  app.append(landing)
  app.append(notification)
  idle.init()
  worker.init()
  preventDeprecatedData()
}

on('user-inactivity', (totalMinutes = 0) => {
  if (totalMinutes !== 30 && totalMinutes !== 60) return
  emit('send-reminder')
})
