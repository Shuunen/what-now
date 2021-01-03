import { emit } from 'shuutils'

const MINUTE = 60 * 1000
const CHECK_EVERY = 10 * MINUTE

class IdleService {
  inactiveSince = 0
  timer!: NodeJS.Timeout

  init() {
    console.log('idle init')
    this.setupListeners()
    this.resetTimer('init')
  }

  setupListeners() {
    const events = ['mousedown', 'touchstart', 'visibilitychange']
    events.forEach(name => document.addEventListener(name, event => this.resetTimer(event.type), true))
  }

  setupTimer() {
    this.timer = setInterval(() => this.dispatchInactivity(), CHECK_EVERY)
  }

  resetTimer(from = 'unknown event') {
    console.log('timer reset due to', from)
    this.inactiveSince = Date.now()
    clearTimeout(this.timer)
    this.setupTimer()
  }

  dispatchInactivity() {
    const inactivePeriod = Date.now() - this.inactiveSince
    const minutes = Math.round(inactivePeriod / MINUTE)
    console.log('user has been inactive for', minutes, 'minute(s)')
    if (minutes === 30) emit('send-reminder')
  }
}

export const idleService = new IdleService()
