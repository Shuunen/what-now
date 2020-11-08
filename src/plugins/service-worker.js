// Thanks https://github.com/master-atul/web-push-demo

class AppServiceWorker {
  get currentProgress () {
    return Number.parseInt(document.body.getAttribute('data-progress') || 0)
  }

  get canNotify () {
    return this.notificationPerm === 'granted'
  }

  constructor () {
    this.setupListeners()
    this.setupWorker()
    this.checkNotificationPerm()
  }

  on (eventName, callback) { window.addEventListener(eventName, event => callback.bind(this)(event.detail)) }
  showError (message) { this.emit('show-toast', { type: 'error', message }) }
  showInfo (message) { this.emit('show-toast', { type: 'info', message }) }

  setupListeners () {
    this.on('ask-notification-perm', this.askNotificationPerm)
    this.on('send-reminder', this.sendReminder)
  }

  async setupWorker () {
    this.registerServiceWorker()
      .then(() => console.log('service-worker has been registered'))
      .catch(error => console.error('failed to handle service worker', error))
  }

  async emit (eventName, eventData) {
    console.log(eventName, eventData)
    window.dispatchEvent(new CustomEvent(eventName, { detail: eventData }))
  }

  async sendReminder () {
    if (!this.canNotify) return
    const registration = await navigator.serviceWorker.ready
    if (this.currentProgress === 100) return this.showInfo('no reminders in heaven')
    this.showInfo('trigger reminder')
    return registration.sync.register('reminder')
  }

  checkNotificationPerm () {
    this.notificationPerm = window.Notification.permission
    // default: user has never been asked
    // denied: user has refused
    if (this.notificationPerm === 'default') this.emit('suggest-notification')
  }

  async askNotificationPerm () {
    if (!('permission' in Notification)) return this.showError('Notifications cannot be enabled on this device.')
    this.notificationPerm = await window.Notification.requestPermission()
    // granted: user has accepted the request
    // default: user has dismissed the notification permission popup by clicking on x
    // denied: user has denied the request.
    if (!this.canNotify) return this.showInfo('Notification permission not granted')
    // this.showInfo('Notification are now enabled')
  }

  async registerServiceWorker () {
    if (!('serviceWorker' in navigator)) throw new Error('No Service Worker support!')
    const file = 'service-worker.js'
    return navigator.serviceWorker.register(file)
  }
}

export const appServiceWorker = new AppServiceWorker()
