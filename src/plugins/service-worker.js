// Thanks https://github.com/master-atul/web-push-demo

const check = async () => {
  if (!('serviceWorker' in navigator)) {
    throw new Error('No Service Worker support!')
  }
  if (!('permission' in Notification)) {
    throw new Error('No Push API Support!')
  }
}

const emit = (eventName, eventData) => {
  console.log(`%c${eventName}`, 'color: blue', eventData)
  window.dispatchEvent(new CustomEvent(eventName, { detail: eventData }))
}

const triggerSync = async (registration, type) => registration.sync.register(type)

const sendReminder = () => navigator.serviceWorker.ready.then(registration => {
  emit('show-toast', { type: 'info', message: 'sync reminder' })
  triggerSync(registration, 'reminder')
})

const sendReminders = () => {
  sendReminder()
  setInterval(sendReminder, 30 * 60 * 1000)
}

const registerServiceWorker = async () => {
  const file = 'service-worker.js'
  await navigator.serviceWorker.register(file)
  sendReminders()
}

const requestNotificationPermission = async () => {
  const permission = await window.Notification.requestPermission()
  // value of permission can be 'granted', 'default', 'denied'
  // granted: user has accepted the request
  // default: user has dismissed the notification permission popup by clicking on x
  // denied: user has denied the request.
  if (permission !== 'granted') {
    throw new Error('Permission not granted for Notification')
  }
}

const handleServiceWorker = async () => {
  await check()
  await requestNotificationPermission()
  await registerServiceWorker()
}

handleServiceWorker()
  .then(registration => console.log('service-worker has been registered'))
  .catch(err => console.error('failed to handle service worker', err))
