import { type } from '@camwiegert/typical'
import { pickOne, sleep } from 'shuutils'
import TinyGesture from 'tinygesture'
import './plugins/cypress-reload'
import './plugins/inactivity-detector'
import './plugins/service-worker'
import * as storage from './plugins/storage'

const emit = async (eventName, eventData) => { console.log(eventName, eventData); window.dispatchEvent(new CustomEvent(eventName, { detail: eventData })) }
const showError = message => emit('show-toast', { type: 'error', message })
const showLog = message => emit('show-toast', { type: 'info', message })
const headers = { Accept: 'application/json', 'Content-Type': 'application/json' }
const patch = (url, data) => fetch(url, { headers, method: 'patch', body: JSON.stringify(data) })

class App {
  constructor () {
    this.apiBase = undefined
    this.apiKey = undefined
    this.tasksLoaded = false
    this.setupElements()
    this.setupListeners()
    this.recoverApi()
    this.preventDeprecatedData()
  }

  async setLoading (active) { return this.loaderEl.classList.toggle('hidden', !active) }

  setupElements () {
    this.el = document.body
    this.loaderEl = document.querySelector('.loader')
  }

  setupListeners () {
    this.on('show-error', showError)
    this.on('fade-in', this.fadeIn)
    this.on('fade-out', this.fadeOut)
    this.on('set-loading', this.setLoading)
    this.on('api-response', this.parseApiResponse)
    this.on('api-set', this.onApiSet)
    this.on('task-update', this.onTaskUpdate)
    this.on('tasks-loaded', () => (this.tasksLoaded = true))
    this.on('user-inactivity', this.onUserInactivity)
    this.on('type-effect', this.typeEffect)
    const gesture = new TinyGesture(this.el, { mouseSupport: true })
    gesture.on('swiperight', () => emit('task-next', true))
    gesture.on('swipeleft', () => emit('task-next'))
  }

  on (eventName, callback) { window.addEventListener(eventName, event => callback.bind(this)(event.detail)) }

  async onApiSet (data = {}) {
    if (!data.base || !data.key) return console.error('cannot set api without base & key')
    await this.loadTasks(data.base, data.key)
    this.apiBase = await storage.set('api-base', data.base)
    this.apiKey = await storage.set('api-key', data.key)
  }

  async recoverApi () {
    await sleep(10)
    const base = await storage.get('api-base')
    const key = await storage.get('api-key')
    if (base && key) return emit('api-set', { base, key })
    emit('show-toast', { type: 'info', message: 'please setup api in settings' })
    emit('action-required', true)
  }

  loadTasks (apiBase, apiKey) {
    return this.setLoading(true)
      .then(() => fetch(`https://api.airtable.com/v0/${apiBase}/tasks?api_key=${apiKey}&view=todo`))
      .then(response => response.json())
      .then(data => this.parseApiResponse(data))
      .then(() => sleep(500))
      .catch(error => showError(error.message))
      .then(() => this.setLoading(false))
  }

  async fadeIn (element) {
    element.classList.remove('hidden')
    element.classList.add('hide')
    await sleep(10)
    element.style.opacity = 1
  }

  async fadeOut (element) {
    element.classList.add('hide')
    await sleep(350)
    element.classList.remove('hide')
    element.classList.add('hidden')
  }

  async parseApiResponse (data) {
    showLog('parsing api response...')
    if (!data.records) throw new Error('api does not return the expected format')
    const tasks = data.records.map(task => ({ id: task.id, ...task.fields }))
    emit('action-required', false)
    emit('tasks-loaded', tasks)
  }

  async onTaskUpdate (task) {
    if (this.apiBase === null || this.apiKey === null) return showError('cannot update task without api')
    const url = `https://api.airtable.com/v0/${this.apiBase}/tasks/${task.id}?api_key=${this.apiKey}&view=todo`
    const data = { fields: { 'completed-on': task['completed-on'], done: task.done } }
    await patch(url, data).then(response => response.json()).catch(error => showError(error.message))
  }

  onUserInactivity (totalMinutes = 0) {
    if (totalMinutes !== 30 && totalMinutes !== 60) return
    emit('send-reminder')
  }

  preventDeprecatedData () {
    const oneHour = 60 * 60 * 1000
    setTimeout(() => document.location.reload(), oneHour)
  }

  async typeEffect (target) {
    target = target || { el: undefined, text: '' }
    if (!target.el) return console.error('cannot apply type effect without a target dom el')
    if (!target.text || target.text.length === 0) return console.error('cannot apply type effect without a target text')
    if (target.el.classList.contains('is-typing')) {
      console.log('delay type effect because another one is active')
      return setTimeout(() => this.typeEffect(target), 200)
    }
    // eslint-disable-next-line unicorn/consistent-function-scoping
    const toggle = (element) => element.classList.toggle('is-typing')
    target.el.textContent = '' // clear text content is quicker than animate the deletion of all chars
    await type(target.el, toggle, target.text, toggle)
    this.colorOneWord(target.el)
  }

  colorOneWord (element) {
    const words = element.textContent.split(' ')
    const word = pickOne(words)
    element.innerHTML = element.textContent.replace(word, `<em>${word}</em>`)
  }
}
// eslint-disable-next-line no-new
new App()
