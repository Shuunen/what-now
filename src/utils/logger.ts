import { LogLevel, Logger } from 'shuutils'

export const logger = new Logger({ willOutputToConsole: typeof window !== 'undefined', minimumLevel: LogLevel.Info })
