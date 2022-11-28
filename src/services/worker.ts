import { emit, on } from 'shuutils'
import { numbers } from '../utils'

class WorkerService {
  private notificationPerm = window.Notification.permission

  private get currentProgress (): number {
    const { progress = '0' } = document.body.dataset
    return Number.parseInt(progress, 10)
  }

  private get canNotify (): boolean {
    return this.notificationPerm === 'granted'
  }

  public init (): void {
    this.setupListeners()
    void this.setupWorker()
  }

  private setupListeners (): void {
    on('ask-notification-perm', this.askNotificationPerm.bind(this))
    on('send-reminder', this.sendReminder.bind(this))
  }

  private checkNotificationPerm (): void {
    this.notificationPerm = window.Notification.permission

    // default: user has never been asked
    // denied: user has refused
    if (this.notificationPerm === 'default') emit('suggest-notification')
  }

  private async setupWorker (): Promise<void> {
    await this.registerServiceWorker()
    this.checkNotificationPerm()
  }

  private async registerServiceWorker (): Promise<void> {
    if (!('serviceWorker' in navigator)) throw new Error('No Service Worker support!')
    const file = 'service-worker.js'
    await navigator.serviceWorker.register(file)
  }



  private async sendReminder (): Promise<void> {
    if (!this.canNotify) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const registration: any = await navigator.serviceWorker.ready
    if (this.currentProgress === numbers.hundredPercent) {
      console.log('no reminders in heaven')
      return
    }
    console.log('trigger reminder')
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    registration.sync.register('reminder')
  }

  private async askNotificationPerm (): Promise<void> {
    if (!('permission' in Notification)) { console.error('Notifications cannot be enabled on this device.'); return }
    this.notificationPerm = await window.Notification.requestPermission()

    // granted: user has accepted the request
    // default: user has dismissed the notification permission popup by clicking on x
    // denied: user has denied the request.
    if (!this.canNotify) console.log('Notification permission not granted')
  }
}

export const workerService = new WorkerService()
