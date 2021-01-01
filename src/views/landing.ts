import { storage } from 'shuutils'
import { div, dom } from '../utils'
import { credentials } from './credentials'
import { tasks } from './tasks'

export const landing = div()

const title = dom('h1', 'What now', 'text-5xl sm:text-7xl mb-4 text-blue-300')
landing.append(title)

Promise.all([storage.has('api-base'), storage.has('api-key')]).then(exists => {
  const credentialsExists = !exists.includes(false)
  title.textContent += credentialsExists ? ' ?' : ''
  landing.append(credentialsExists ? tasks : credentials)
}).catch(error => console.error(error))
