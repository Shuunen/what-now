import { emit, on, storage } from 'shuutils'
import { AirtableResponse, Task } from '../models'
import { getTasks } from '../services/tasks'
import { button, div, dom, p } from '../utils'
import { progress } from './counter'

export const tasks = div()

const message = p('Fetching data from Airtable...', 'message font-light mb-3 text-2xl mb-2')
tasks.append(message)
tasks.append(progress)

const retry = button('Setup credentials', 'mt-4')
retry.addEventListener('click', () => {
  storage.clear('api-base')
  storage.clear('api-key')
  document.location.reload()
})

const handleError = (response: AirtableResponse) => {
  if (response.error && response.error.type === 'UNAUTHORIZED') message.textContent = 'The credentials you provided does not work'
  else message.textContent = 'Failed to fetch data from Airtable'
  message.textContent += ', click the button below to try again.'
  message.className = 'text-red-200'
  tasks.append(retry)
}

on('get-tasks-error', handleError)

const taskLine = (task: Task) => {
  const active = task.isActive()
  const line = dom('button', '', 'task transition-transform duration-500 transform mr-auto px-2 py-1 -ml-2')
  line.dataset.taskId = task.id
  line.innerHTML = `  &nbsp;${task.name}`
  updateLine(line, active)
  return line
}

const updateLine = (line: HTMLElement, active = false) => {
  line.dataset.active = String(active)
  line.classList.toggle('translate-x-6', !active)
  line.classList.toggle('opacity-60', !active)
  line.textContent = `${active ? '◦' : '🗸'}  ${(line.textContent ?? '').slice(2)}`
}

const onClick = (button: HTMLElement, list: Task[]) => {
  if (button === null || button.dataset.taskId === undefined) return
  const target = list.find(t => t.id === button.dataset.taskId)
  if (target === undefined) return console.error('failed to find this task in list')
  target.toggleComplete()
  updateLine(button, target.activated)
  emit('update-counter')
}

const addList = (list: Task[]) => {
  message.textContent = `Found ${list.length} tasks for today !`
  const container = div('grid gap-2')
  list.forEach(task => container.append(taskLine(task)))
  tasks.append(container)
  emit('update-counter')
  container.addEventListener('click', (event: Event) => onClick(event.target as HTMLElement, list))
}

getTasks().then(list => addList(list)).catch(error => console.error(error))
