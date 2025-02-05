/* c8 ignore start */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable jsdoc/require-jsdoc */
import { isBrowserEnvironment, Logger } from 'shuutils'
import { state } from './state.utils'

function stuffToMessage (...stuff: unknown[]) {
  return stuff.map(thing => {
    if (typeof thing === 'string') return thing
    if (typeof thing === 'object') return JSON.stringify(thing)
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return String(thing)
  }).join(', ')
}

// eslint-disable-next-line no-restricted-syntax
class CustomLogger extends Logger {
  public override error (...stuff: unknown[]) {
    super.error(...stuff)
    state.showErrorToast = stuffToMessage(...stuff)
  }
}

const logger = new CustomLogger({ minimumLevel: '3-info', willOutputToConsole: isBrowserEnvironment() })

export { logger, stuffToMessage }
