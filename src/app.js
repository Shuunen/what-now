import './plugins/cypress-reload'
import * as storage from './plugins/storage'

const settingsTriggerEl = document.querySelector('.settings--trigger')

function setupListeners () {
  window.addEventListener('settings-submitted', (event) => {
    console.log('new settings submitted :', event.detail)
    settingsTriggerEl.classList.remove('action-required')
    storage.set('api', event.detail.api)
  })
}

function verifySettings () {
  storage.has('api').then(apiDefined => {
    if (!apiDefined) {
      console.log('api is not defined')
      settingsTriggerEl.classList.add('action-required')
    }
  })
}

function init () {
  verifySettings()
  setupListeners()
}

init()
