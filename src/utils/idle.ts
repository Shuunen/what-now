import { debounce, emit, Nb } from 'shuutils'
import { logger } from './logger'

// eslint-disable-next-line no-new
new class IdleService {
  private inactiveSince = 0

  private timer!: NodeJS.Timeout

  public constructor () {
    this.setupListeners()
    this.resetTimer('init')
  }

  private setupListeners (): void {
    const events = ['mousedown', 'touchstart', 'visibilitychange']
    const resetTimer = debounce(this.resetTimer.bind(this), Nb.Two * Nb.Hundred)
    events.forEach(name => { document.addEventListener(name, event => { void resetTimer(event.type) }, true) })
  }

  private setupTimer (): void {
    this.timer = setInterval(() => { this.checkInactivity() }, Nb.Ten * Nb.MsInMinute)
  }

  private resetTimer (from = 'unknown event'): void {
    logger.info('timer reset due to', from)
    this.inactiveSince = Date.now()
    clearTimeout(this.timer)
    this.setupTimer()
    emit('user-activity', from)
  }

  private checkInactivity (): void {
    const inactivePeriod = Date.now() - this.inactiveSince
    const minutes = Math.round(inactivePeriod / Nb.MsInMinute)
    logger.info('user has been inactive for', minutes, 'minute(s)')
    if (minutes === Nb.OneThird * Nb.Hundred) emit('send-reminder')
  }
}
