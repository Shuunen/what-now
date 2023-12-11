/* c8 ignore start */
import { debounce, emit, nbMsInMinute } from 'shuutils'
import { logger } from './logger.utils'

// eslint-disable-next-line no-new
new class IdleService {

  private inactiveSince = 0

  private readonly resetTimerDelay = 200 // ms

  private readonly checkInactivityEvery = 10 // minutes

  private readonly sendReminderEvery = 30 // minutes

  private timer!: NodeJS.Timeout

  public constructor () {
    this.setupListeners()
    this.resetTimer('init')
  }

  private setupListeners () {
    const events = ['mousedown', 'touchstart', 'visibilitychange', 'focus', 'blur']
    const resetTimer = debounce(this.resetTimer.bind(this), this.resetTimerDelay)
    events.forEach(name => { window.addEventListener(name, event => { void resetTimer(event.type) }, true) })
  }

  private setupTimer () {
    this.timer = setInterval(() => { this.checkInactivity() }, this.checkInactivityEvery * nbMsInMinute)
  }

  private resetTimer (from = 'unknown event') {
    logger.info('timer reset due to', from)
    this.inactiveSince = Date.now()
    clearTimeout(this.timer)
    this.setupTimer()
    emit('user-activity', from)
  }

  private checkInactivity () {
    const inactivePeriod = Date.now() - this.inactiveSince
    const minutes = Math.round(inactivePeriod / nbMsInMinute)
    logger.info('user has been inactive for', minutes, 'minute(s)')
    if (minutes === this.sendReminderEvery) emit('send-reminder')
  }
}
