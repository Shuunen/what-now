import { credentialService, idleService, tasksService, workerService } from './services'
import './styles.css'
import { landing } from './views/landing'

document.body.append(landing)

credentialService.init()
idleService.init()
tasksService.init()
workerService.init()
