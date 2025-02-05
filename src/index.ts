import { div, on, storage } from 'shuutils'
import { credentials } from './components/credentials'
import { notification } from './components/notifications'
import { status } from './components/status'
import { tasks } from './components/tasks'
import { timer } from './components/timer'
import { title } from './components/title'
import { toasts } from './components/toasts'
import { checkUrlCredentials } from './utils/credentials.utils'
import './utils/database.utils'
import './utils/idle.utils'
import { watchState } from './utils/state.utils'
import { loadTasks } from './utils/tasks.utils'
import './utils/worker'
import './style.css'

storage.prefix = 'what-now_'

on('user-activity', () => { void loadTasks() })
watchState('isSetup', () => { void loadTasks() })

const landing = div('landing')
landing.append(title, credentials, status, notification, timer, tasks, toasts)
document.body.prepend(landing)

checkUrlCredentials(document.location.hash)
