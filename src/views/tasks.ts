import { dateIso10, storage } from 'shuutils'
import { AirtableResponse, Task } from '../models'
import { button } from '../utils'

export const tasks = document.createElement('div')

const message = document.createElement('p')
message.textContent = 'Fetching data from Airtable...'
message.className = 'font-light mb-3 text-2xl mb-2'
tasks.append(message)

const progress = document.createElement('hr')
progress.className = 'mb-2'
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

const taskLine = (task: Task) => {
  const active = task.isActive()
  const line = document.createElement('button')
  line.className = 'task transition-transform duration-500 transform mr-auto px-2 py-1 -ml-2'
  line.dataset.taskId = task.id
  line.innerHTML = `  &nbsp;${task.name}`
  updateLine(line, active)
  return line
}

const updateLine = (line: HTMLButtonElement, active = false) => {
  console.log(`updating newly ${active ? 'active' : 'inactive'} line :`, line.textContent)
  line.dataset.active = String(active)
  line.classList.toggle('translate-x-6', !active)
  line.classList.toggle('opacity-60', !active)
  line.textContent = `${active ? '◦' : '🗸'}  ${(line.textContent ?? '').slice(2)}`
}

const counterText = (total = 0, remaining = 0, percent = 0) => {
  const done = total - remaining
  if (done === 0) return 'Nothing done... yet'
  if (percent <= 25) return 'Amuse-bouche : check'
  if (percent <= 45) return 'Now we are talking'
  if (percent <= 55) return 'Halfway to heaven'
  if (percent <= 85) return `Final chapter, ${remaining} tasks remaining`
  if (percent < 100 && remaining > 1) return `Only ${remaining} tasks remaining`
  if (remaining === 1) return 'Last task ^^'
  return 'You made it, well done dude :)'
}

const updateProgress = (percent = 0) => {
  progress.style.width = `${percent}%`
}

const updateCounter = () => {
  const total = document.querySelectorAll('[data-task-id]').length
  const remaining = document.querySelectorAll('[data-active="true"]').length
  const percent = 100 - Math.round(remaining / total * 100)
  message.textContent = counterText(total, remaining, percent)
  updateProgress(percent)
}

const addList = (list: Task[]) => {
  const div = document.createElement('div')
  div.className = 'grid gap-2'
  list.forEach(task => div.append(taskLine(task)))
  tasks.append(div)

  div.addEventListener('click', (event: Event) => {
    if (event.target === null) return
    const button = event.target as HTMLButtonElement
    if (button.dataset.taskId === undefined) return
    const target = list.find(t => t.id === button.dataset.taskId)
    if (target === undefined) return console.error('failed to find this task in list')
    target.toggleComplete()
    updateLine(button, target.activated)
    updateCounter()
  })
}

Promise.all([storage.get('api-base'), storage.get('api-key')]).then(async ([base, key]) => {
  if (base === undefined || key === undefined) return
  const data: AirtableResponse = await fetch(`https://api.airtable.com/v0/${String(base)}/tasks?api_key=${String(key)}&view=todo`).then(async response => response.json())
  if (data.error) return handleError(data)
  const today = dateIso10()
  const list = data.records.map(record => new Task(String(record.id), record.fields.name, record.fields.once, record.fields['completed-on'])).filter(task => (task.completedOn === today || task.isActive()))
  message.textContent = `Found ${list.length} tasks for today !`
  addList(list)
  updateCounter()
}).catch(error => console.error(error))
