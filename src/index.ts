import { div, on, storage } from 'shuutils'
import { credentials } from './components/credentials'
import { notification } from './components/notifications'
import { status } from './components/status'
import { tasks } from './components/tasks'
import { timer } from './components/timer'
import { title } from './components/title'
import { watchState } from './state'
import { checkCredentials } from './utils/airtable'
import './utils/idle'
import { loadTasks } from './utils/tasks'
import './utils/worker'

storage.prefix = 'what-now_'

on('user-activity', () => { void loadTasks() })
watchState('isSetup', () => { void loadTasks() })

const landing = div('landing')
landing.append(title, status, notification, timer, credentials, tasks)
document.body.prepend(landing)

checkCredentials(document.location.hash)
