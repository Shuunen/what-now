import { setup } from 'twind/shim'
import { credentialService, idleService, tasksService, workerService } from './services'
import { landing } from './views/landing'

setup({ mode: 'silent' })
document.body.append(landing)

credentialService.init()
idleService.init()
tasksService.init()
workerService.init()
