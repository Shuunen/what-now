import './plugins/cypress-reload'
import * as storage from './plugins/storage'

const loaderEl = document.querySelector('.loader')
const settingsTriggerEl = document.querySelector('.settings--trigger')

const setLoading = active => loaderEl.classList.toggle('hidden', !active)

  }
  el.classList.add('fade')
  el.style.opacity = isVisible ? 1 : 0
  setTimeout(() => (el.classList.toggle('hidden', isVisible)), isVisible ? 300 : 10)
  setTimeout(() => (el.style.opacity = isVisible ? 0 : 1), 20)
}

const setLoading = (active, infinite) => {
  toggleVisibility(loaderEl, active)
  if (infinite === undefined) {
    setTimeout(() => setLoading(false), 1000)
  }
}

window.addEventListener('settings-submitted', (event) => {
  console.log('new settings submitted :', event.detail)
  setLoading(true)
  settingsTriggerEl.classList.remove('action-required')
  storage.set('api', event.detail.api)
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
