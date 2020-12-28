import { has } from '../utils'
import { credentials } from './credentials'
import { tasks } from './tasks'

export const landing = document.createElement('div')

const title = document.createElement('h1')
title.textContent = 'What now'
title.className = 'text-5xl sm:text-7xl mb-4 text-blue-300'
landing.append(title)

Promise.all([has('api-base'), has('api-key')]).then(exists => {
  const credentialsExists = !exists.includes(false)
  title.textContent += credentialsExists ? ' ?' : ''
  landing.append(credentialsExists ? tasks : credentials)
}).catch(error => console.error(error))
