import TinyGesture from 'tinygesture'
import './plugins/cypress-reload'
import './plugins/inactivity-detector'
import './plugins/service-worker'
import * as storage from './plugins/storage'

class App {
  constructor () {
    this.apiBase = null
    this.apiKey = null
    this.tasksLoaded = false
    this.setupElements()
    this.setupListeners()
    this.recoverApi()
    this.preventDeprecatedData()
  }

  async setLoading (active) {
    return this.loaderEl.classList.toggle('hidden', !active)
  }

  async sleep (ms) {
    return new Promise(resolve => setTimeout(resolve, (ms || 1000)))
  }

  setupElements () {
    this.el = document.body
    this.loaderEl = document.querySelector('.loader')
  }

  setupListeners () {
    this.on('show-error', this.showError)
    this.on('fade-in', this.fadeIn)
    this.on('fade-out', this.fadeOut)
    this.on('set-loading', this.setLoading)
    this.on('api-response', this.parseApiResponse)
    this.on('api-set', this.onApiSet)
    this.on('task-update', this.onTaskUpdate)
    this.on('task-done', this.onTaskDone)
    this.on('tasks-done', this.onTasksDone)
    this.on('tasks-loaded', () => (this.tasksLoaded = true))
    this.on('user-inactivity', this.onUserInactivity)
    this.on('type-effect', this.typeEffect)
    const gesture = new TinyGesture(this.el, { mouseSupport: true })
    gesture.on('swiperight', () => this.emit('task-next', true))
    gesture.on('swipeleft', () => this.emit('task-next'))
  }

  on (eventName, callback) {
    window.addEventListener(eventName, event => callback.bind(this)(event.detail))
  }

  async emit (eventName, eventData) {
    console.log(eventName, eventData)
    window.dispatchEvent(new CustomEvent(eventName, { detail: eventData }))
  }

  async onApiSet (data = {}) {
    if (!data.base || !data.key) return console.error('cannot set api without base & key')
    await this.loadTasks(data.base, data.key)
    this.apiBase = await storage.set('api-base', data.base)
    this.apiKey = await storage.set('api-key', data.key)
  }

  async recoverApi () {
    await this.sleep(10)
    const base = await storage.get('api-base')
    const key = await storage.get('api-key')
    if (base && key) return this.emit('api-set', { base, key })
    this.emit('show-toast', { type: 'info', message: 'please setup api in settings' })
    this.emit('action-required', true)
  }

  loadTasks (apiBase, apiKey) {
    return this.setLoading(true)
      .then(() => fetch(`https://api.airtable.com/v0/${apiBase}/tasks?api_key=${apiKey}&view=todo`))
      .then(res => res.json())
      .then(data => this.parseApiResponse(data))
      .then(() => this.emit('action-required', false))
      .then(() => this.sleep(500))
      .catch(err => this.showError(err.message))
      .then(() => this.setLoading(false))
  }

  async fadeIn (el) {
    el.classList.remove('hidden')
    el.classList.add('hide')
    await this.sleep(10)
    el.style.opacity = 1
  }

  async fadeOut (el) {
    el.classList.add('hide')
    await this.sleep(350)
    el.classList.remove('hide')
    el.classList.add('hidden')
  }

  showError (message) {
    console.error('app show error :', message)
    this.emit('show-toast', { type: 'error', message })
  }

  showLog (message, data) {
    console.log('app show log :', message, data || '')
    return this.emit('show-toast', { type: 'info', message })
  }

  async parseApiResponse (data) {
    this.showLog('parsing api response...', data)
    if (!data.records) {
      throw Error('api does not return the expected format')
    }
    const tasks = data.records.map(task => ({
      id: task.id,
      ...task.fields,
    }))
    this.emit('level-max', tasks.length)
    this.emit('tasks-loaded', tasks)
  }

  patch (url, data) {
    return fetch(url, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'patch',
      body: JSON.stringify(data),
    })
  }

  async onTaskUpdate (task) {
    if (this.apiBase === null || this.apiKey === null) return this.showError('cannot update task without api')
    const url = `https://api.airtable.com/v0/${this.apiBase}/tasks/${task.id}?api_key=${this.apiKey}&view=todo`
    const data = { fields: { 'completed-on': task['completed-on'], done: task.done } }
    await this.patch(url, data).then(res => res.json()).catch(err => this.showError(err.message))
  }

  onTaskDone () {
    this.emit('add-badge', { type: 'task-done', content: '*' })
    this.emit('level-up')
  }

  onTasksDone () {
    this.emit('add-badge', { type: 'tasks-done', content: '🎖️' })
  }

  onUserInactivity (totalMinutes = 0) {
    if (totalMinutes !== 30 && totalMinutes !== 60) return
    this.emit('send-reminder')
  }

  preventDeprecatedData () {
    const oneHour = 60 * 60 * 1000
    setTimeout(() => document.location.reload(), oneHour)
  }
}
// eslint-disable-next-line no-new
new App()
