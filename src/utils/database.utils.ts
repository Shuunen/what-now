/* eslint-disable unicorn/prevent-abbreviations */
import { Client, Databases, Query, type Models } from 'appwrite'
import { nbPercentMax, slugify } from 'shuutils'
import type { AppWriteTask, Task } from '../types'
import { logger } from './logger.utils'
import { state } from './state.utils'

const client = new Client()
const database = new Databases(client)
client.setEndpoint('https://cloud.appwrite.io/v1').setProject('what-now')

type AppWriteTaskModel = AppWriteTask & Models.Document

export const uuidMaxLength = 36

/**
 * Convert a task from the database to a task in the app
 * @param task the db task to convert
 * @returns the app task
 */
export function dbToLocalTask (task: AppWriteTaskModel) {
  return {
    completedOn: task['completed-on'],
    id: task.$id,
    isDone: task.done,
    minutes: task.minutes,
    name: task.name,
    once: task.once,
  } satisfies Task
}

/**
 * Convert a task from the app to the task format used in the database
 * @param task the app task to convert
 * @returns the db task
 */
export function localToDbTask (task: Readonly<Task>) {
  return {
    'completed-on': task.completedOn,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    done: task.isDone,
    minutes: task.minutes,
    name: task.name,
    once: task.once,
  } satisfies AppWriteTask
}

/* c8 ignore next 10 */
/**
 * Add a task to the database
 * @param data the task to add
 * @returns true if the task was added
 */
export async function addTask (data: Readonly<AppWriteTask>) {
  const id = slugify(data.name).slice(0, uuidMaxLength)
  const response = await database.createDocument(state.apiDatabase, state.apiCollection, id, data)
  return response.$id === id
}

/**
 * Update a task in the database
 * @param task the task to update
 * @returns true if the task was updated
 */
export async function updateTask (task: Readonly<Task>) {
  const data = localToDbTask(task)
  const response = await database.updateDocument<AppWriteTaskModel>(state.apiDatabase, state.apiCollection, task.id, data)
  return response.$id === task.id
}

/**
 * Get all tasks from the database
 * @returns all tasks
 */
export async function getTasks () {
  const response = await database.listDocuments<AppWriteTaskModel>(state.apiDatabase, state.apiCollection, [Query.limit(nbPercentMax)])
  const tasks = response.documents.map<Task>((task) => dbToLocalTask(task))
  logger.info(`found ${response.total} tasks on db`, tasks)
  return tasks
}
