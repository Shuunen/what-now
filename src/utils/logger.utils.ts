/* v8 ignore file -- @preserve */
import { isBrowserEnvironment, Logger } from 'shuutils'

export const logger = new Logger({ minimumLevel: '3-info', willOutputToConsole: isBrowserEnvironment() })
