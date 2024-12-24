/* c8 ignore start */
/* eslint-disable @typescript-eslint/class-methods-use-this */
/* eslint-disable jsdoc/require-jsdoc */
import { emit, on } from 'shuutils'
import { logger } from './logger.utils'

// eslint-disable-next-line no-new
new class WorkerService {
  private notificationPerm = globalThis.Notification.permission

  public constructor () {
    this.setupListeners()
    void this.setupWorker()
  }

  private async askNotificationPerm () {
    if (!('permission' in Notification)) { logger.error('Notifications cannot be enabled on this device.'); return }
    this.notificationPerm = await globalThis.Notification.requestPermission()
    // granted: user has accepted the request
    // default: user has dismissed the notification permission popup by clicking on x
    // denied: user has denied the request.
    if (!this.canNotify) logger.info('Notification permission not granted')
  }

  private get canNotify () {
    return this.notificationPerm === 'granted'
  }

  private checkNotificationPerm () {
    this.notificationPerm = globalThis.Notification.permission
    // default: user has never been asked
    // denied: user has refused
    if (this.notificationPerm === 'default') emit('suggest-notification')
  }

  private get currentProgress () {
    const { progress = '0' } = document.body.dataset
    return Number.parseInt(progress, 10)
  }

  private async registerServiceWorker () {
    if (!('serviceWorker' in navigator)) { logger.error('No Service Worker support!'); return }
    const file = 'service-worker.js'
    await navigator.serviceWorker.register(file)
  }

  private sendReminder () {
    if (!this.canNotify) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const registration: any = navigator.serviceWorker.ready
    if (this.currentProgress === 100) { // eslint-disable-line @typescript-eslint/no-magic-numbers
      logger.info('no reminders in heaven')
      return
    }
    logger.info('trigger reminder')
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    registration.sync.register('reminder')
  }

  private setupListeners () {
    on('ask-notification-perm', this.askNotificationPerm.bind(this))
    on('send-reminder', this.sendReminder.bind(this))
  }

  private async setupWorker () {
    await this.registerServiceWorker()
    this.checkNotificationPerm()
  }
}
