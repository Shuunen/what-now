/* c8 ignore start */
import { logger } from './logger.utils'
import { state } from './state.utils'

/**
 * Check if we are in home network
 * @returns {Promise<boolean>} true if we are in home network
 */
async function isHomeNetwork () {
  // because of CORS, localhost cannot reach ipapi.co and therefore it means we are in home network
  const response = await fetch('https://ipapi.co/version').catch(() => new Response('IPv4'))
  const version = await response.text()
  // if we are in home network, we are in IPv4, otherwise we are in IPv6
  return version === 'IPv4'
}

/**
 * Check if we are in home network
 */
export async function checkHomeNetwork () {
  const isHomeBefore = state.isHomeNetwork
  const isHomeNow = await isHomeNetwork()
  if (isHomeBefore === isHomeNow) return
  state.isHomeNetwork = isHomeNow // eslint-disable-line require-atomic-updates
  logger.info(`isHomeNetwork is now ${String(isHomeNow)}`)
}
