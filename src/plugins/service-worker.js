
if (navigator.serviceWorker && !navigator.serviceWorker.controller) {
  const file = './plugins/service-worker.js'
  console.log('register service worker')
  navigator.serviceWorker.register(file)
}

self.addEventListener('install', () => console.log('service worker : install'))

self.addEventListener('activate', () => console.log('service worker : activate'))

function notifyMe () {
  console.log('notifyMe')
  if (Notification.permission === 'granted') {
    notify()
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission.then(
      permission => (permission === 'granted' ? notify() : null)
    )
  }
}

function notify () {
  navigator.serviceWorker.getRegistration()
    .then(instance => instance.showNotification('Hey dude'))
}

notifyMe()
