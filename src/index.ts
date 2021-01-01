import { landing } from './views'

const app = document.querySelector('#app')

if (app) {
  app.className = 'flex flex-col min-h-full items-center justify-center p-6 bg-gray-900 text-blue-100'
  app.append(landing)
}
