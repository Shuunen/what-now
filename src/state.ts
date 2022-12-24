/* c8 ignore next */
import { createState, storage } from 'shuutils'
import type { AirtableTask } from './utils/airtable'

const tasks: AirtableTask[] = []

export const { state, watchState } = createState({
  apiBase: '',
  apiKey: '',
  isLoading: false,
  isSetup: false,
  statusError: '',
  statusInfo: 'Loading, please wait...',
  statusProgress: '',
  tasks,
  tasksTimestamp: 0,
}, storage, ['apiBase', 'apiKey', 'tasks', 'tasksTimestamp'])
