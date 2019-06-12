import './plugins/cypress-reload'
import * as storage from './plugins/storage'

const loaderEl = document.querySelector('.loader')
const settingsTriggerEl = document.querySelector('.settings--trigger')

const setLoading = active => loaderEl.classList.toggle('hidden', !active)

const parseTasks = json => {
  json = json.replace(/\w.*\[(\w+)\]/g, (m, m1) => m1.toLowerCase())
  try {
    window.dispatchEvent(new CustomEvent('tasks-loaded', { detail: JSON.parse(json) }))
    return Promise.resolve('tasks-loaded')
  } catch (err) {
    return Promise.reject(new Error('failed at parsing json' + err))
  }
}

const loadTasks = api => {
  storage.set('api', api)
    .then(() => fetch(api))
    .then(res => res.text())
    .then(json => parseTasks(json))
    .catch(err => console.error(err))
    .then(() => setLoading(false))
}

window.addEventListener('settings-submitted', (event) => {
  console.log('new settings submitted :', event.detail)
  setLoading(true)
  settingsTriggerEl.classList.remove('action-required')
  loadTasks(event.detail.api)
})

setTimeout(() => {
  storage.get('api')
    .then(api => {
      console.log('found api', api)
      window.dispatchEvent(new CustomEvent('api-recovered', { detail: api }))
    })
    .catch(() => {
      console.log('found no api in storage')
      settingsTriggerEl.classList.add('action-required')
    })
}, 100)
