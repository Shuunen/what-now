import { div, on, storage } from 'shuutils'
import { credentials } from './components/credentials'
import { notification } from './components/notifications'
import { status } from './components/status'
import { tasks } from './components/tasks'
import { timer } from './components/timer'
import { title } from './components/title'
import { toasts } from './components/toasts'
import { checkCredentials } from './utils/airtable.utils'
import './utils/idle.utils'
import { checkHomeNetwork } from './utils/network.utils'
import { watchState } from './utils/state.utils'
import { loadTasks } from './utils/tasks.utils'
import './utils/worker'

storage.prefix = 'what-now_'

on('user-activity', () => { void loadTasks(); void checkHomeNetwork() })
watchState('isSetup', () => { void loadTasks() })

const landing = div('landing')
landing.append(title, credentials, status, notification, timer, tasks, toasts)
document.body.prepend(landing)

checkCredentials(document.location.hash)
