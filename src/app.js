import './plugins/cypress-reload'
import * as storage from './plugins/storage'

class App {
  constructor () {
    this.loaderEl = document.querySelector('.loader')
    this.settingsTriggerEl = document.querySelector('.settings--trigger')
    this.recoverApi()
    this.setupListeners()
  }
  async setLoading (active) {
    return this.loaderEl.classList.toggle('hidden', !active)
  }
  async sleep (ms) {
    return new Promise(resolve => setTimeout(resolve, (ms || 1000)))
  }
  setupListeners () {
    window.addEventListener('settings-submitted', (event) => {
      console.log('new settings submitted :', event.detail)
      this.settingsTriggerEl.classList.remove('action-required')
      this.loadTasks(event.detail.api)
    })
    window.addEventListener('show-error', event => this.showError(event.detail))
    window.addEventListener('fade-out', event => this.fadeOut(event.detail))
  }
  recoverApi () {
    this.sleep(100)
      .then(() => storage.get('api'))
      .then(api => {
        console.log('found api', api)
        window.dispatchEvent(new CustomEvent('api-recovered', { detail: api }))
        this.loadTasks(api)
      })
      .catch(() => {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'info', message: 'please setup api in settings' } }))
        this.settingsTriggerEl.classList.add('action-required')
      })
  }
  loadTasks (api) {
    this.setLoading(true)
      .then(() => storage.set('api', api))
      .then(() => fetch(api))
      .then(res => res.text())
      .then(json => this.parseTasks(json))
      .catch(err => this.showError(err.message))
      .then(() => this.setLoading(false))
  }
  async fadeOut (el) {
    el.classList.add('hide')
    await this.sleep(350)
    el.classList.remove('hide')
    el.classList.add('hidden')
  }
  showError (message) {
    console.error(message)
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'error', message } }))
  }
  parseTasks (json) {
    json = json.replace(/\w.*\[(\w+)\]/g, (m, m1) => m1.toLowerCase())
    try {
      window.dispatchEvent(new CustomEvent('tasks-loaded', { detail: JSON.parse(json) }))
      return Promise.resolve('tasks-loaded')
    } catch (err) {
      console.error(err)
      return Promise.reject(new Error('api does not return the expected format'))
    }
  }
}
// eslint-disable-next-line no-new
new App()
