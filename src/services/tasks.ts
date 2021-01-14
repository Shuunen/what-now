import { dateIso10, daysAgoIso10, emit, on } from 'shuutils'
import { AirtableResponse, Task } from '../models'
import { patch } from '../utils'
import { credentialService } from './credentials'

class TasksService {
  init() {
    this.setupListeners()
    this.preventDeprecatedData()
  }

  setupListeners() {
    on('task-update', async task => this.updateTask(task))
    on('fetch-tasks', async () => this.loadTasks())
    on('use-credentials', async () => this.loadTasks())
    on('dispatch-tasks', async () => this.dispatch())
  }

  async updateTask(task: Task) {
    const url = await credentialService.airtableUrl(`tasks/${task.id}`)
    if (typeof url !== 'string') return
    const data = { fields: { 'completed-on': task.completedOn, done: task.done } }
    const response = await patch(url, data).catch(error => console.error(error.message))
    if ((response as any).error) return emit('update-task-error', response)
  }

  async fetchList(): Promise<Task[]> {
    const url = await credentialService.airtableUrl('tasks')
    if (typeof url !== 'string') return []
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
