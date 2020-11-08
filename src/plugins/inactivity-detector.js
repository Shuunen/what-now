const MINUTE = 60 * 1000
const CHECK_EVERY = 10 * MINUTE

class Idle {
  get now () {
    return new Date().getTime()
  }

  constructor () {
    console.log('inactivity detector start')
    this.setupListeners()
    this.resetTimer('init')
  }

  async emit (eventName, eventData) {
    console.log(eventName, eventData)
    window.dispatchEvent(new CustomEvent(eventName, { detail: eventData }))
  }

  setupListeners () {
    const events = ['mousedown', 'touchstart', 'visibilitychange']
    events.forEach((name) => document.addEventListener(name, event => this.resetTimer(event.type), true))
  }

  setupTimer () {
    this.timer = setInterval(() => this.dispatchInactivity(), CHECK_EVERY)
  }

  resetTimer (from = 'unknown event') {
    console.log('timer reset due to', from)
    this.inactiveSince = this.now
    clearTimeout(this.timer)
    this.setupTimer()
  }

  dispatchInactivity () {
    const inactivePeriod = this.now - this.inactiveSince
    const minutes = Math.round(inactivePeriod / MINUTE)
    console.log('user has been inactive for', minutes, 'minute(s)')
    this.emit('user-inactivity', minutes)
  }
}

window.addEventListener('load', new Idle())
