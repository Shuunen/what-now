import { setup as twind } from 'twind/shim'
import { credentialService, idleService, tasksService, workerService } from './services'
import { landing } from './views/landing'

twind({ mode: 'silent' })
document.body.append(landing)

credentialService.init()
idleService.init()
tasksService.init()
workerService.init()
