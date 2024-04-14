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
import { isHomeNetwork } from './utils/network.utils'
import { state, watchState } from './utils/state.utils'
import { loadTasks } from './utils/tasks.utils'
import './utils/worker'

storage.prefix = 'what-now_'

// eslint-disable-next-line unicorn/prefer-top-level-await, promise/always-return
void isHomeNetwork().then((isHome: boolean) => { state.isHomeNetwork = isHome })

on('user-activity', () => { void loadTasks() })
watchState('isSetup', () => { void loadTasks() })

const landing = div('landing')
landing.append(title, credentials, status, notification, timer, tasks, toasts)
document.body.prepend(landing)

checkCredentials(document.location.hash)
