import { idleService, tasksService, workerService } from './services'
import { landing } from './views/landing'

document.body.append(landing)

idleService.init()
tasksService.init()
workerService.init()
