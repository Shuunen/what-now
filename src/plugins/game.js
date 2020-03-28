class Game {
  get level () {
    return this._level
  }

  set level (newLevel = 0) {
    this._level = Math.min(newLevel, this.maxLevel)
    this.dispatchProgression()
  }

  get progression () {
    if (this.level === 0) return 0
    return Math.min(Math.round(this._level / this.maxLevel * 100), 100)
  }

  constructor () {
    this.el = document.body
    this._level = 0
    this.maxLevel = 10
    this.setupListeners()
    this.setupDevListeners()
  }

  setupListeners () {
    window.addEventListener('level-max', event => this.setLevelMax(event.detail))
    window.addEventListener('level-up', () => this.onLevelUp())
    window.addEventListener('level-down', () => this.onLevelDown())
  }

  setupDevListeners () {
    window.addEventListener('keyup', (event) => {
      if (event.key === '+') return this.onLevelUp()
      if (event.key === '-') return this.onLevelDown()
    })
  }

  async emit (eventName, eventData) {
    console.log(eventName, eventData)
    window.dispatchEvent(new CustomEvent(eventName, { detail: eventData }))
  }

  setLevelMax (newMaxLevel) {
    if (!newMaxLevel) return console.error('missing level max value')
    console.log('setting level max to', newMaxLevel)
    this.maxLevel = newMaxLevel
    this.dispatchProgression()
  }

  onLevelUp () {
    console.log('onLevelUp')
    this.level++
  }

  onLevelDown () {
    console.log('onLevelDown')
    this.level--
  }

  dispatchProgression () {
    this.el.setAttribute('data-progress', this.progression)
  }
}

export const instance = new Game()
