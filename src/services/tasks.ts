import { dateIso10, daysAgoIso10, emit, on, storage } from 'shuutils'
import { AirtableResponse, Task } from '../models'
import { patch } from '../utils'

class TasksService {
  apiBase = ''
  apiKey = ''

  init() {
    this.setupListeners()
    this.loadTasks()
    this.preventDeprecatedData()
  }

  setupListeners() {
    on('task-update', async task => this.updateTask(task))
    on('fetch-tasks', async () => this.loadTasks())
    on('dispatch-tasks', async () => this.dispatch())
  }

  airtableUrl(target = '') {
    return `https://api.airtable.com/v0/${this.apiBase}/${target}?api_key=${this.apiKey}&view=todo`
  }

  async missingCredentials(): Promise<boolean> {
    this.apiBase = await storage.get('api-base')
    this.apiKey = await storage.get('api-key')
    const missing = this.apiBase === undefined || this.apiKey === undefined
    if (missing) console.error('need credentials to discuss with airtable')
    return missing
  }

  async updateTask(task: Task) {
    if (await this.missingCredentials()) return
    const url = this.airtableUrl(`tasks/${task.id}`)
    const data = { fields: { 'completed-on': task.completedOn, done: task.done } }
    const response = await patch(url, data).catch(error => console.error(error.message))
    if ((response as any).error) return emit('update-task-error', response)
  }

  async fetchList(): Promise<Task[]> {
    if (await this.missingCredentials()) return []
    const url = this.airtableUrl('tasks')
    const response: AirtableResponse = await fetch(url).then(async response => response.json())
    if (response.error) {
      emit('get-tasks-error', response)
      return []
    }

    const today = dateIso10()
    return response.records.map(record => {
      const id = String(record.id)
      const { name = '', once = 'day' } = record.fields
      return new Task(id, name, once, record.fields['completed-on'], record.fields['average-time'])
    }).filter(task => (task.completedOn === today || task.isActive()))
  }

  loadTasks() {
    this.fetchList()
      .then(tasks => emit('tasks-loaded', tasks))
      .catch(error => console.error(error.message))
  }

  async dispatchTask(task: Task, index = 0): Promise<void> {
    if (task.once === 'day') return
    const delay = task.daysRecurrence()
    const position = index % delay
    const newCompletionDate = daysAgoIso10((-1 * position) + delay)
    if (newCompletionDate === task.completedOn) return
    task.completedOn = newCompletionDate
    return this.updateTask(task).catch(error => console.error(error.message))
  }

  async dispatch() {
    const tasks = await this.fetchList()
    await Promise.all(tasks.map(async (task, index) => this.dispatchTask(task, index)))
    this.loadTasks()
  }

  preventDeprecatedData() {
    const every = 30 * 60 * 1000 // 30 minutes
    setInterval(async () => this.loadTasks(), every)
  }
}

export const tasksService = new TasksService()
