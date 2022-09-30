import { div, dom, emit, on, p, storage } from 'shuutils'
import type { AirtableResponse, Task } from '../models'
import { button } from '../utils'
import { progress } from './counter'

export const tasks = div('tasks')

const messageClass = 'message font-light mb-3 text-2xl mb-2' // trouver une meilleure solution
const message = p(messageClass, 'Fetching data from Airtable...')
tasks.append(message)
tasks.append(progress)

const retry = button('Setup credentials', 'mt-4 hidden')
retry.addEventListener('click', () => {
  storage.clear('api-base')
  storage.clear('api-key')
  emit('need-credentials')
  retry.classList.toggle('hidden')
  message.className = messageClass
})
tasks.append(retry)

const handleError = (response: AirtableResponse): void => {
  message.textContent = response.error && response.error.type === 'UNAUTHORIZED' ? 'The credentials you provided does not work' : 'Failed to fetch data from Airtable'
  message.textContent += ', click the button below to try again.'
  message.className = 'text-red-200'
  retry.classList.toggle('hidden')
}

on('get-tasks-error', handleError)

const createLine = (task: Task): HTMLButtonElement => {
  const line = dom('button', 'task transition-transform duration-500 transform mr-auto px-2 py-1 -ml-2')
  line.dataset['taskId'] = task.id
  updateLine(line, task)
  return line
}

const updateLine = (line: HTMLElement, task: Task): void => {
  const active = task.isActive()
  line.dataset['active'] = String(active)
  line.textContent = `${active ? '◦' : '✔️'} ${task.name}`
  line.classList.toggle('translate-x-6', !active)
  line.classList.toggle('opacity-60', !active)
}

const onClick = (line: HTMLElement, list: Task[]): void => {
  if (line === null || line.dataset['taskId'] === undefined) return
  const task = list.find(t => t.id === line.dataset['taskId'])
  if (task === undefined) return console.error('failed to find this task in list')
  task.toggleComplete()
  updateLine(line, task)
  emit('update-counter')
}

const addList = (list: Task[]): void => {
  if (list.length === 0) return
  message.textContent = `Found ${list.length} tasks for today !`
  const container = div('task-list grid gap-2')
  list.forEach(task => container.append(createLine(task)))
  tasks.append(container)
  emit('update-counter')
  container.addEventListener('click', (event: Event) => onClick(event.target as HTMLElement, list))
}

const updateList = (container: Element, list: Task[]): void => {
  const lines = container.querySelectorAll<HTMLElement>('.task-list > .task')
  const processed: string[] = []
  lines.forEach(line => {
    const task = list.find(t => (t.id === line.dataset['taskId']))
    if (task === undefined) return line.remove() // deleting a task in dom that does not exists on Airtable
    processed.push(task.id)
    updateLine(line, task)
  })
  const missing = list.filter(t => !processed.includes(t.id)) // exists on Airtable but not in dom
  missing.forEach(task => container.append(createLine(task)))
  emit('update-counter')
}

const onTaskLoaded = (list: Task[]): void => {
  const container = document.querySelector('.task-list')
  if (container === null) return addList(list)
  updateList(container, list)
}

on('tasks-loaded', (list: Task[]) => onTaskLoaded(list))
