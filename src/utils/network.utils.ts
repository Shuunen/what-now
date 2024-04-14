/* c8 ignore start */
import { logger } from './logger.utils'

// eslint-disable-next-line @microsoft/sdl/no-insecure-url, sonar/no-clear-text-protocols
export async function isHomeNetwork (checkUrl = 'http://192.168.0.1') {
  // eslint-disable-next-line promise/avoid-new
  return await new Promise<boolean>((resolve) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', checkUrl, true)
    xhr.timeout = 300
    xhr.addEventListener('load', function onLoadCallback () {
      if (xhr.status === 200) logger.info('Feels like home :) connection successful, device is reachable') // eslint-disable-line @typescript-eslint/no-magic-numbers
      else logger.info(`Feels like home :) connection error, ${xhr.statusText}, device is reachable`)
      resolve(true)
    })
    xhr.onerror = function onErrorCallback () { // eslint-disable-line func-name-matching, unicorn/prefer-add-event-listener
      logger.info('Feels like home :) connection failed, device seems reachable and seems to reject the connection')
      resolve(true)
    }
    xhr.ontimeout = function onTimeoutCallback () { // eslint-disable-line func-name-matching
      logger.info('Does not feels like home :( Connection timed out, device is not reachable')
      resolve(false)
    }
    xhr.send()
  })
}
