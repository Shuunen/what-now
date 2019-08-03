
if (navigator.serviceWorker && !navigator.serviceWorker.controller) {
  const file = 'service-worker.js'
  console.log('asking for notification permission')
  Notification
    .requestPermission(permission => {
      if (!('permission' in Notification)) {
        Notification.permission = permission
      }
      return permission
    })
    .then(() => navigator.serviceWorker.register(file))
    .then(registration => console.log('service-worker has been registered'))
    .catch(err => console.error('failed to register service worker', err))
}
