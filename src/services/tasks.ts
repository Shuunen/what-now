import { dateIso10, emit, on, storage } from 'shuutils'
import { AirtableResponse, Task } from '../models'
import { patch } from '../utils'

class TasksService {
  apiBase = ''
  apiKey = ''

  init() {
    console.log('tasks service init')
    this.setupListeners()
    this.fetchList().catch(error => console.error(error.message))
    this.preventDeprecatedData()
  }

  setupListeners() {
    on('task-update', async task => this.updateTask(task))
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
    const url = `https://api.airtable.com/v0/${this.apiBase}/tasks/${task.id}?api_key=${this.apiKey}&view=todo`
    const data = { fields: { 'completed-on': task.completedOn, done: task.done } }
    const response = await patch(url, data).catch(error => console.error(error.message))
    if ((response as any).error) return emit('update-task-error', response)
  }

  async fetchList() {
    if (await this.missingCredentials()) return
    const url = `https://api.airtable.com/v0/${this.apiBase}/tasks?api_key=${this.apiKey}&view=todo`
    const response: AirtableResponse = await fetch(url).then(async response => response.json())
    if (response.error) return emit('get-tasks-error', response)
    const today = dateIso10()
    const list = response.records.map(record => new Task(String(record.id), record.fields.name, record.fields.once, record.fields['completed-on'])).filter(task => (task.completedOn === today || task.isActive()))
    emit('tasks-loaded', list)
  }

  preventDeprecatedData() {
    const oneHour = 60 * 60 * 1000
    // reload in an hour no matter what :)
    setTimeout(() => document.location.reload(), oneHour)
  }
}

export const tasksService = new TasksService()
