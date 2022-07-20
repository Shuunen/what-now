import { emit, on } from 'shuutils'

class WorkerService {
  notificationPerm = window.Notification.permission

  get currentProgress (): number {
    const { progress = '0' } = document.body.dataset
    return Number.parseInt(progress, 10)
  }

  get canNotify (): boolean {
    return this.notificationPerm === 'granted'
  }

  init (): void {
    this.setupListeners()
    this.setupWorker()
  }

  setupListeners (): void {
    on('ask-notification-perm', async () => this.askNotificationPerm())
    on('send-reminder', async () => this.sendReminder())
  }

  setupWorker (): void {
    this.registerServiceWorker().then(() => {
      // console.log('service-worker has been registered')
      return this.checkNotificationPerm()
    }).catch(error => console.error(error))
  }

  async sendReminder (): Promise<unknown> {
    if (!this.canNotify) return
    const registration = await navigator.serviceWorker.ready
    if (this.currentProgress === 100) return console.log('no reminders in heaven')
    console.log('trigger reminder')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (registration as any).sync.register('reminder')
  }

  checkNotificationPerm (): void {
    this.notificationPerm = window.Notification.permission
    // default: user has never been asked
    // denied: user has refused
    if (this.notificationPerm === 'default') emit('suggest-notification')
  }

  async askNotificationPerm (): Promise<void> {
    if (!('permission' in Notification)) return console.error('Notifications cannot be enabled on this device.')
    this.notificationPerm = await window.Notification.requestPermission()
    // granted: user has accepted the request
    // default: user has dismissed the notification permission popup by clicking on x
    // denied: user has denied the request.
    if (!this.canNotify) return console.log('Notification permission not granted')
    // console.log('Notification are now enabled')
  }

  async registerServiceWorker (): Promise<ServiceWorkerRegistration> {
    if (!('serviceWorker' in navigator)) throw new Error('No Service Worker support!')
    const file = 'service-worker.js'
    return navigator.serviceWorker.register(file)
  }
}

export const workerService = new WorkerService()
