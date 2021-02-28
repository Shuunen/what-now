/* global clients, self */

const version = 9
const url = new URL('', self.location.origin).href

const pickOne = array => array[Math.floor(Math.random() * array.length)]
const getWindowClients = async () => clients.matchAll({ type: 'window', includeUncontrolled: true })
const getClientByUrl = async url => getWindowClients().then(clients => clients.find(client => client.url === url))
const getCurrentClient = async () => getClientByUrl(url)
const openMeInANewTab = async () => clients.openWindow(url)
const focusOrOpenMe = async () => getCurrentClient().then(client => client ? client.focus() : openMeInANewTab())
const isCurrentClientFocused = async () => getCurrentClient().then(client => (client.focused || client.visibilityState === 'visible'))
const getNotifications = async () => self.registration.getNotifications()
const getDisplayedReminder = async () => getNotifications().then(notifications => notifications.find(notification => notification.tag === 'reminder'))

const showNotification = (title, icon = 'android-chrome-192x192.png', tag = '', permanent = false) => {
  const options = { tag, icon, renotify: permanent, requireInteraction: permanent }
  self.registration.showNotification(title, options)
}

const showReminder = async () => {
  if (await isCurrentClientFocused()) return console.log('avoid displaying reminders to a client which already have what-now displayed (tab focus) ^^')
  if (await getDisplayedReminder()) return console.log('avoid displaying another reminder ^^')
  const motivator = getMotivator()
  showNotification(motivator.text, motivator.icon, 'reminder', true)
}

self.addEventListener('install', () => {
  console.log('service worker : install version', version)
  return self.skipWaiting()
})

self.addEventListener('activate', () => {
  console.log('service worker : activate version', version)
})

self.addEventListener('notificationclick', event => {
  console.log('service worker : notification click on tag', event.notification.tag)
  if (event.notification.tag === 'reminder') event.waitUntil(focusOrOpenMe())
})

self.addEventListener('sync', event => {
  // console.log('service worker : got sync request for tag', event.tag)
  if (event.tag === 'reminder') return event.waitUntil(showReminder())
  console.warn('un-handled sync tag', event.tag)
})

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
const getMotivator = () => pickOne(motivators)
