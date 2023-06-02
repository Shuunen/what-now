import { LogLevel, Logger } from 'shuutils'
import { state } from './state'

function stuffToMessage (...stuff: unknown[]): string {
  return stuff.map(thing => {
    if (typeof thing === 'string') return thing
    if (typeof thing === 'object') return JSON.stringify(thing)
    return String(thing)
  }).join(', ')
}

/* c8 ignore next 5 */
class CustomLogger extends Logger {
  public override error (...stuff: unknown[]): void {
    super.error(...stuff)
    state.showErrorToast = stuffToMessage(...stuff)
  }
}

const logger = new CustomLogger({ willOutputToConsole: typeof window !== 'undefined', minimumLevel: LogLevel.Info })

export { logger, stuffToMessage }
