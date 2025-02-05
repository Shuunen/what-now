/* eslint-disable jsdoc/require-jsdoc */
/* eslint-disable no-console */ // console.log is needed here, cannot use logger
import { pickOne } from 'shuutils'

const version = '__unique-mark__'
const url = new URL('', self.location.origin).href
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

interface NotificationEvent extends ExtendableEvent { tag: string }
interface ServiceWorkerEvent extends NotificationEvent { notification: NotificationEvent; tag: string }

async function getWindowClients () {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  return clients.matchAll({ includeUncontrolled: true, type: 'window' })
}

async function getCurrentClient () {
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  return getWindowClients().then(clients => clients.find(client => client.url === url))
}

async function openMeInAnewTab () {
  return clients.openWindow(url)
}

async function focusOrOpenMe () {
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  return getCurrentClient().then(async (client) => client ? client.focus() : openMeInAnewTab())
}

async function isCurrentClientFocused () {
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  return getCurrentClient().then(client => ((client?.focused ?? false) || client?.visibilityState === 'visible'))
}

async function getNotifications () {
  return globalThis.registration.getNotifications()
}

async function getDisplayedReminder () {
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  return getNotifications().then(notifications => notifications.find(notification => notification.tag === 'reminder'))
}

function getMotivator () {
  return pickOne(motivators)
}

// eslint-disable-next-line @typescript-eslint/max-params
function showNotification (title = '', icon = 'android-chrome-192x192.png', tag = '', isPermanent = false) {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const options = { icon, renotify: isPermanent, requireInteraction: isPermanent, tag }
  void globalThis.registration.showNotification(title, options)
}

async function showReminder () {
  if (await isCurrentClientFocused()) { console.log('avoid displaying reminders to a client which already have what-now displayed (tab focus) ^^'); return }
  if (await getDisplayedReminder()) { console.log('avoid displaying another reminder ^^'); return }
  const motivator = getMotivator()
  showNotification(motivator.text, motivator.icon, 'reminder', true)
}

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
function onNotificationClick (event: ServiceWorkerEvent) {
  console.log('service worker : notification click on tag', event.notification.tag)
  if (event.notification.tag === 'reminder') event.waitUntil(focusOrOpenMe())
}

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
function onSync (event: ServiceWorkerEvent) {
  console.log('service worker : got sync request for tag', event.tag)
  if (event.tag === 'reminder') event.waitUntil(showReminder())
  else console.warn('un-handled sync tag', event.tag)
}

self.addEventListener('install', () => {
  console.log('service worker : install version', version)
  void globalThis.skipWaiting()
})

self.addEventListener('activate', () => {
  console.log('service worker : activate version', version)
})

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unsafe-type-assertion
self.addEventListener('notificationclick', onNotificationClick as EventListenerOrEventListenerObject)
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unsafe-type-assertion
self.addEventListener('sync', onSync as EventListenerOrEventListenerObject)
