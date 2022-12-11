import { debounce, emit, Nb } from 'shuutils'

const checkInactivityEveryMinutes = 10
const sendReminderAfterMinutes = 30
const resetTimerDelay = 200

class IdleService {
  private inactiveSince = 0

  private timer!: NodeJS.Timeout

  public init (): void {
    this.setupListeners()
    this.resetTimer('init')
  }

  private setupListeners (): void {
    const events = ['mousedown', 'touchstart', 'visibilitychange']
    const resetTimer = debounce(this.resetTimer.bind(this), resetTimerDelay)
    events.forEach(name => { document.addEventListener(name, event => { void resetTimer(event.type) }, true) })
  }

  private setupTimer (): void {
    this.timer = setInterval(() => { this.checkInactivity() }, checkInactivityEveryMinutes * Nb.MsInMinute)
  }

  private resetTimer (from = 'unknown event'): void {
    console.log('timer reset due to', from)
    this.inactiveSince = Date.now()
    clearTimeout(this.timer)
    this.setupTimer()
    emit('user-activity', from)
  }

  private checkInactivity (): void {
    const inactivePeriod = Date.now() - this.inactiveSince
    const minutes = Math.round(inactivePeriod / Nb.MsInMinute)
    console.log('user has been inactive for', minutes, 'minute(s)')
    if (minutes === sendReminderAfterMinutes) emit('send-reminder')
  }
}

export const idleService = new IdleService()
