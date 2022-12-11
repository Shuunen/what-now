import confetti from 'canvas-confetti'
import { div, dom, emit, on, pickOne, sleep, storage, text } from 'shuutils'
import type { AirtableResponse, Task } from '../models'
import { button, emojis } from '../utils'
import { progress } from './counter'

const tasks = div('tasks')

const fireworksLeft = new Audio('/fireworks.mp3')
const fireworksRight = new Audio('/fireworks.mp3')
const messageClass = 'message font-light mb-3 text-2xl mb-2' // trouver une meilleure solution
const message = text(messageClass, 'Fetching data from Airtable...')
tasks.append(message)
tasks.append(progress)

const retry = button('Setup credentials', 'mt-4 hidden')
retry.addEventListener('click', () => {
  storage.clear('api-base')
  storage.clear('api-key')
  emit('need-credentials')
  retry.classList.toggle('hidden')
  // eslint-disable-next-line unicorn/no-keyword-prefix
  message.className = messageClass
})
tasks.append(retry)

function handleError (response: AirtableResponse): void {
  console.error('handle error response', response)
  let content = response.error && response.error.type === 'UNAUTHORIZED' ? 'The credentials you provided does not work' : 'Failed to fetch data from Airtable'
  content += ', click the button below to try again.'
  message.textContent = content
  // eslint-disable-next-line unicorn/no-keyword-prefix
  message.className = 'text-red-200'
  retry.classList.toggle('hidden')
}

on('get-tasks-error', handleError)

function updateLine (line: HTMLElement, task: Task): void {
  const isActive = task.isActive()
  line.dataset.active = String(isActive)
  line.innerHTML = `${isActive ? pickOne(emojis) : '✔️'}&nbsp; ${task.name}`
  line.classList.toggle('opacity-60', !isActive)
}

function createLine (task: Task): HTMLButtonElement {
  const line = dom('button', 'task transition-transform max-w-full text-start duration-500 transform mr-auto px-2 py-1 -ml-2 whitespace-nowrap overflow-ellipsis overflow-hidden', task.name)
  line.dataset.taskId = task.id
  updateLine(line, task)
  return line
}

async function throwConfettiAround (element: HTMLElement): Promise<void> {
  /* eslint-disable @typescript-eslint/no-magic-numbers */
  const { bottom, left, right } = element.getBoundingClientRect()
  const delta = window.innerWidth < 450 ? 90 : 30
  const positionY = Math.round(bottom / window.innerHeight * 100) / 100
  let positionX = Math.round((left + delta) / window.innerWidth * 100) / 100
  const angle = 20
  void fireworksLeft.play()
  // eslint-disable-next-line id-length
  void confetti({ angle: (90 + angle), origin: { x: positionX, y: positionY } })
  positionX = Math.round((right - delta) / window.innerWidth * 100) / 100
  await sleep(200)
  void fireworksRight.play()
  // eslint-disable-next-line id-length
  void confetti({ angle: (90 - angle), origin: { x: positionX, y: positionY } })
  /* eslint-enable @typescript-eslint/no-magic-numbers */
}

function onClick (line: HTMLElement | null, list: Task[]): void {
  if (line === null || line.dataset.taskId === undefined) return
  const task = list.find(t => t.id === line.dataset.taskId)
  if (task === undefined) { console.error('failed to find this task in list'); return }
  task.toggleComplete()
  if (!task.isActive()) void throwConfettiAround(line)
  updateLine(line, task)
  emit('update-counter')
}

function addList (list: Task[]): void {
  if (list.length === 0)
    return
  message.textContent = `Found ${list.length} tasks for today !`
  const container = div('task-list grid gap-2')
  list.forEach(task => { container.append(createLine(task)) })
  tasks.append(container)
  emit('update-counter')
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  container.addEventListener('click', (event: Event) => { onClick(event.target as HTMLElement, list) })
}

function updateList (container: Element, list: Task[]): void {
  console.log('update list', { container, list })
  const lines = container.querySelectorAll<HTMLElement>('.task-list > .task')
  const processed: string[] = []
  lines.forEach(line => {
    const task = list.find(t => (t.id === line.dataset.taskId))
    if (task === undefined) line.remove() // deleting a task in dom that does not exists on Airtable
    else {
      processed.push(task.id)
      updateLine(line, task)
    }
  })
  const missing = list.filter(t => !processed.includes(t.id)) // exists on Airtable but not in dom
  missing.forEach(task => { container.append(createLine(task)) })
  emit('update-counter')
}

function onTaskLoaded (list: Task[]): void {
  console.log('on task loaded', list)
  const container = document.querySelector('.task-list')
  if (container === null) { addList(list); return }
  updateList(container, list)
}


on('tasks-loaded', (list: Task[]) => { onTaskLoaded(list) })

export { tasks }
