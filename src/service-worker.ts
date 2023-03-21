/* eslint-disable no-console */ // console.log is needed here, cannot use logger
/* eslint-disable func-style */
import { pickOne } from 'shuutils'

const version = 9
const url = new URL('', self.location.origin).href // eslint-disable-line total-functions/no-partial-url-constructor
const motivators = [
  {
    icon: 'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/emojione/211/rocket_1f680.png',
    text: 'Move away from your desktop !',
  },
  {
    icon: 'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/emojione/211/money-bag_1f4b0.png',
    text: 'Wants to win 10.000 ?',
  },
  {
    icon: 'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/emojione/211/aubergine_1f346.png',
    text: 'ENLARGE YOUR PRODUCTIVITY',
  },
  {
    icon: 'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/emojione/211/peach_1f351.png',
    text: 'Time has come, move your ass',
  },
  {
    icon: 'https://vignette.wikia.nocookie.net/theoffice/images/9/9b/Michael_scott.jpg/revision/latest?cb=20120814001200',
    text: 'I need you, just one minute...',
  },
  {
    icon: 'https://i.pinimg.com/originals/f2/1a/ab/f21aabc97d54ab971507d14345ef8007.png',
    text: 'Never give up your dreams',
  },
  {
    icon: 'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/160/emojione/211/chair_1fa91.png',
    text: 'Still on your chair ?',
  },
  {
    icon: 'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/160/emojione/211/mouth_1f444.png',
    text: 'ONE TASK DONE = ONE BLOWJOB, LIMITED OFFER !',
  },
  {
    icon: 'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/160/emojione/211/eyes_1f440.png',
    text: 'Are you even blinking ?',
  },
  {
    icon: 'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/facebook/200/hot-beverage_2615.png',
    text: 'Hmm coffee',
  },
  {
    icon: 'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/emojione/211/sleeping-symbol_1f4a4.png',
    text: 'Time to wake up !',
  },
]

type Motivator = typeof motivators[0]
interface NotificationEvent extends ExtendableEvent { tag: string }
interface ServiceWorkerEvent extends NotificationEvent { notification: NotificationEvent; tag: string }

// eslint-disable-next-line @typescript-eslint/naming-convention
const getWindowClients = async (): Promise<readonly WindowClient[]> => await clients.matchAll({ type: 'window', includeUncontrolled: true })
const getCurrentClient = async (): Promise<WindowClient | undefined> => await getWindowClients().then(clients => clients.find(client => client.url === url))
const openMeInAnewTab = async (): Promise<WindowClient | null> => await clients.openWindow(url)
const focusOrOpenMe = async (): Promise<WindowClient | null> => await getCurrentClient().then(async client => client ? await client.focus() : await openMeInAnewTab())
const isCurrentClientFocused = async (): Promise<boolean> => await getCurrentClient().then(client => ((client?.focused ?? false) || client?.visibilityState === 'visible'))
const getNotifications = async (): Promise<Notification[]> => await self.registration.getNotifications()
const getDisplayedReminder = async (): Promise<Notification | undefined> => await getNotifications().then(notifications => notifications.find(notification => notification.tag === 'reminder'))
const getMotivator = (): Motivator => pickOne(motivators)

// eslint-disable-next-line max-params
const showNotification = (title = '', icon = 'android-chrome-192x192.png', tag = '', isPermanent = false): void => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const options = { tag, icon, renotify: isPermanent, requireInteraction: isPermanent }
  void self.registration.showNotification(title, options)
}

async function showReminder (): Promise<void> {
  if (await isCurrentClientFocused()) { console.log('avoid displaying reminders to a client which already have what-now displayed (tab focus) ^^'); return }
  if (await getDisplayedReminder()) { console.log('avoid displaying another reminder ^^'); return }
  const motivator = getMotivator()
  showNotification(motivator.text, motivator.icon, 'reminder', true)
}

function onNotificationClick (event: ServiceWorkerEvent): void {
  console.log('service worker : notification click on tag', event.notification.tag)
  if (event.notification.tag === 'reminder') event.waitUntil(focusOrOpenMe())
}

function onSync (event: ServiceWorkerEvent): void {
  console.log('service worker : got sync request for tag', event.tag)
  if (event.tag === 'reminder') event.waitUntil(showReminder())
  else console.warn('un-handled sync tag', event.tag)
}

self.addEventListener('install', () => {
  console.log('service worker : install version', version)
  void self.skipWaiting()
})

self.addEventListener('activate', () => {
  console.log('service worker : activate version', version)
})

self.addEventListener('notificationclick', onNotificationClick as EventListenerOrEventListenerObject) // eslint-disable-line @typescript-eslint/consistent-type-assertions
self.addEventListener('sync', onSync as EventListenerOrEventListenerObject) // eslint-disable-line @typescript-eslint/consistent-type-assertions
