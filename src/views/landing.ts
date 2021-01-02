import { storage } from 'shuutils'
import { credentials, tasks } from '.'
import { div, dom } from '../utils'
import { notification } from './notifications'

export const landing = div('landing')

const title = dom('h1', 'What now', 'text-5xl sm:text-7xl mb-4 text-blue-300')
landing.append(title)
landing.append(notification)

Promise.all([storage.has('api-base'), storage.has('api-key')]).then(exists => {
  const credentialsExists = !exists.includes(false)
  title.textContent += credentialsExists ? ' ?' : ''
  landing.append(credentialsExists ? tasks : credentials)
}).catch(error => console.error(error))
