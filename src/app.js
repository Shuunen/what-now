import './plugins/cypress-reload'
import './plugins/service-worker'
import * as storage from './plugins/storage'

class App {
  constructor () {
    this.loaderEl = document.querySelector('.loader')
    this.apiBase = null
    this.apiKey = null
    this.tasksLoaded = false
    this.setupListeners()
    this.recoverApi()
  }

  async setLoading (active) {
    return this.loaderEl.classList.toggle('hidden', !active)
  }

  async sleep (ms) {
    return new Promise(resolve => setTimeout(resolve, (ms || 1000)))
  }

  setupListeners () {
    window.addEventListener('show-error', event => this.showError(event.detail))
    window.addEventListener('fade-in', event => this.fadeIn(event.detail))
    window.addEventListener('fade-out', event => this.fadeOut(event.detail))
    window.addEventListener('set-loading', event => this.setLoading(event.detail))
    window.addEventListener('api-response', event => this.parseApiResponse(event.detail))
    window.addEventListener('api-set', event => this.onApiSet(event.detail.base, event.detail.key))
    window.addEventListener('task-update', event => this.onTaskUpdate(event.detail))
    window.addEventListener('task-done', () => this.onTaskDone())
    window.addEventListener('task-skipped', () => this.onTaskSkipped())
    window.addEventListener('tasks-done', () => this.onTasksDone())
    window.addEventListener('tasks-loaded', () => (this.tasksLoaded = true))
  }

  async emit (eventName, eventData) {
    console.log(`%c${eventName}`, 'color: blue', eventData)
    window.dispatchEvent(new CustomEvent(eventName, { detail: eventData }))
  }

  onApiSet (base, key) {
    return this.loadTasks(base, key)
      .then(() => {
        this.apiBase = base
        return storage.set('api-base', base)
      })
      .then(() => {
        this.apiKey = key
        return storage.set('api-key', key)
      })
  }

  recoverApi () {
    this.sleep(10)
      .then(() => Promise.all([storage.get('api-base'), storage.get('api-key')]))
      .then(([base, key]) => this.emit('api-set', { base, key }))
      .catch(() => {
        if (!this.tasksLoaded) {
          this.emit('show-toast', { type: 'info', message: 'please setup api in settings' })
          this.emit('action-required', true)
        }
      })
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
    if (!el.classList.contains('hide')) {
      return console.warn('please add "hide" class before mounting dom element and then call fade-in')
    }
    await this.sleep(10)
    // eslint-disable-next-line require-atomic-updates
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
    console.log('%c' + 'app show log :', 'font-weight: bold', message, data || '')
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
    this.emit('tasks-loaded', tasks)
  }

  parseTasks (json) {
    json = json.replace(/\w.*\[(\w+)\]/g, (m, m1) => m1.toLowerCase())
    try {
      this.emit('tasks-loaded', JSON.parse(json))
      return Promise.resolve('tasks-loaded')
    } catch (err) {
      console.error(err)
      return Promise.reject(new Error('api does not return the expected format'))
    }
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

  onTaskUpdate (task) {
    if (this.apiBase === null || this.apiKey === null) {
      return this.showError('cannot update task without api')
    }
    const url = `https://api.airtable.com/v0/${this.apiBase}/tasks/${task.id}?api_key=${this.apiKey}&view=todo`
    const data = { fields: { 'completed-on': task['completed-on'], done: task.done } }
    return this.setLoading(true)
      .then(() => this.patch(url, data))
      .then(res => res.json())
      .then(() => this.sleep(500))
      .catch(err => this.showError(err.message))
      .then(() => this.setLoading(false))
  }

  onTaskDone () {
    this.emit('add-badge', { type: 'task-done', content: '⭐' })
  }

  onTaskSkipped () {
    this.emit('remove-badge', { type: 'task-done' })
  }

  onTasksDone () {
    this.emit('add-badge', { type: 'tasks-done', content: '🎖️' })
  }
}
// eslint-disable-next-line no-new
new App()
