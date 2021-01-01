import { dateIso10, emit, storage } from 'shuutils'
import { AirtableResponse, Task } from '../models'

export const getTasks = async (): Promise<Task[]> => {
  const base = await storage.get('api-base')
  const key = await storage.get('api-key')
  if (base === undefined || key === undefined) return []
  const data: AirtableResponse = await fetch(`https://api.airtable.com/v0/${String(base)}/tasks?api_key=${String(key)}&view=todo`).then(async response => response.json())
  if (data.error) {
    emit('get-tasks-error', data)
    return []
  }

  const today = dateIso10()
  return data.records.map(record => new Task(String(record.id), record.fields.name, record.fields.once, record.fields['completed-on'])).filter(task => (task.completedOn === today || task.isActive()))
}
