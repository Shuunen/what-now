import { storage } from 'shuutils'
import { credentialService, idleService, tasksService, workerService } from './services'
import { landing } from './views/landing'

storage.prefix = 'what-now_'

document.body.prepend(landing)

credentialService.init()
idleService.init()
tasksService.init()
workerService.init()
