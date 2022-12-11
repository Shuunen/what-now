import { dateIso10, Nb, daysAgoIso10, emit, on } from 'shuutils'
import { Task } from '../models'
import { get, patch } from '../utils'
import { credentialService } from './credentials'

const reloadTasksAfterMinutes = 10

class TasksService {
  private updatedOn = Date.now()

  public init (): void {
    this.setupListeners()
  }

  private setupListeners (): void {
    on('task-update', this.updateTask.bind(this))
    on('fetch-tasks', this.loadTasks.bind(this))
    on('use-credentials', this.loadTasks.bind(this))
    on('dispatch-tasks', this.dispatch.bind(this))
    on('user-activity', this.checkDeprecated.bind(this))
  }

  private checkDeprecated (): void {
    const age = Date.now() - this.updatedOn
    const minutes = Math.round(age / Nb.MsInMinute)
    if (minutes > 0) console.log('last activity', minutes, 'minute(s) ago')
    if (minutes >= reloadTasksAfterMinutes) void this.loadTasks()
  }

  private async loadTasks (): Promise<void> {
    console.log('load tasks')
    const tasks = await this.fetchList()
    emit('tasks-loaded', tasks)
  }

  private async updateTask (task: Task): Promise<boolean> {
    console.log('update task', task)
    const url = credentialService.airtableUrl(`tasks/${task.id}`)
    if (typeof url !== 'string') return false
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const data = { fields: { 'completed-on': task.completedOn, 'done': task.isDone } }
    const response = await patch(url, data)
    if (response.error) return emit('update-task-error', response)
    return true
  }

  private async fetchList (): Promise<Task[]> {
    console.log('fetch list')
    const url = credentialService.airtableUrl('tasks')
    if (typeof url !== 'string') return []
    const response = await get(url)
    if (response.error) {
      emit('get-tasks-error', response)
      return []
    }
    this.updatedOn = Date.now()
    const today = dateIso10()
    return (response.records ?? []).map(record => {
      const id = String(record.id)
      const { name = '', once = 'day' } = record.fields
      return new Task(id, name, once, record.fields['completed-on'], record.fields['average-time'])
    }).filter(task => (task.completedOn === today || task.isActive()))
  }

  private async dispatchTask (task: Task, index = 0): Promise<boolean> {
    if (task.once === 'day') return false
    const delay = task.daysRecurrence()
    const position = index % delay
    const completionDate = daysAgoIso10((Nb.Before * position) + delay)
    if (completionDate === task.completedOn) return false
    task.completedOn = completionDate
    await this.updateTask(task)
    return true
  }

  private async dispatch (): Promise<void> {
    console.log('dispatch tasks')
    const tasks = await this.fetchList()
    await Promise.all(tasks.map(async (task, index) => await this.dispatchTask(task, index)))
    await this.loadTasks()
  }
}

export const tasksService = new TasksService()
