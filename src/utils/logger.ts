import { LogLevel, Logger } from 'shuutils'
import { state } from './state'

/* c8 ignore next 5 */
class CustomLogger extends Logger {
  public override error (...stuff: unknown[]): void {
    super.error(...stuff)
    state.showErrorToast = stuff.join(', ')
  }
}

const logger = new CustomLogger({ willOutputToConsole: typeof window !== 'undefined', minimumLevel: LogLevel.Info })

export { logger }
