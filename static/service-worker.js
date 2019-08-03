/* global clients */

const version = 8
const url = new URL('', self.location.origin).href

async function getWindowClients () {
  return clients.matchAll({ type: 'window', includeUncontrolled: true })
}

async function getClientByUrl (url) {
  return getWindowClients().then(clients => clients.find(client => client.url === url))
}

async function getCurrentClient () {
  return getClientByUrl(url).then(client => {
    console.log('service worker : found current client', client)
    return client
  })
}

async function openMeInANewTab () {
  return clients.openWindow(url)
}

async function focusOrOpenMe () {
  return getCurrentClient().then(client => client ? client.focus() : openMeInANewTab())
}

async function isCurrentClientFocused () {
  return getCurrentClient().then(client => (client.focused || client.visibilityState === 'visible'))
}

self.addEventListener('install', () => {
  console.log('service worker : install version', version)
  return self.skipWaiting()
})

self.addEventListener('activate', () => {
  console.log('service worker : activate version', version)
})

self.addEventListener('push', event => {
  console.log('service worker : push detected version', version)
  isCurrentClientFocused().then(clientIsFocused => {
    if (clientIsFocused) {
      return console.log('avoid displaying notifications to an active client ^^')
    }
    console.log('service worker : user is not currently focused')
    const data = event.data.json()
    const options = { body: data.body }
    self.registration.showNotification(data.title, options)
  })
})

self.addEventListener('notificationclick', event => {
  event.waitUntil(focusOrOpenMe())
})
