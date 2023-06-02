import { div, ellipsis, LogLevel, sleep, tw } from 'shuutils'
import { state, watchState } from '../utils/state'

const toasts = div('app-toasts fixed bottom-3 z-10 right-5 select-none ml-5')

function buildToast (type: LogLevel, message: string) {
  const toast = div(tw('app-toast mt-2 rounded-lg bg-gradient-to-tr p-4 opacity-0 shadow-lg transition-all delay-300 ease-in-out'))
  const icon = div(tw('relative -top-0.5 float-left opacity-60 saturate-0'), type === LogLevel.Error ? '⚠' : 'ℹ️')
  const text = div(tw('ml-1 inline'), ellipsis(message, 100))  // eslint-disable-line @typescript-eslint/no-magic-numbers
  toast.append(icon, text)
  toasts.append(toast)
  return toast
}

async function hideToast (toast: HTMLElement) {
  toast.classList.add(tw('translate-x-16'))
  await sleep(10) // eslint-disable-line @typescript-eslint/no-magic-numbers
  toast.classList.remove(tw('opacity-100'))
  setTimeout(() => { toast.remove() }, 500) // eslint-disable-line @typescript-eslint/no-magic-numbers
}

async function showToast (type: LogLevel, message: string, delay = 5000) {
  const toast = buildToast(type, message)
  if (type === LogLevel.Error) toast.classList.add(tw('from-red-950/70'), tw('to-red-900/50'))
  else toast.classList.add(tw('from-gray-950/70'), tw('to-gray-900/50'))
  setTimeout(() => { toast.classList.add(tw('opacity-100')) }, 100) // eslint-disable-line @typescript-eslint/no-magic-numbers
  toast.addEventListener('click', () => { void hideToast(toast) })
  await sleep(delay)
  void hideToast(toast)
}

watchState('showErrorToast', () => { void showToast(LogLevel.Error, state.showErrorToast) })

export { toasts }
