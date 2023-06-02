import { createState, storage } from 'shuutils'
import type { AirtableTask } from '../types'

const tasks: AirtableTask[] = []

export const { state, watchState } = createState({
  apiBase: '',
  apiKey: '',
  isLoading: false,
  isSetup: false,
  hueEndpoint: '',
  showErrorToast: '',
  statusError: '',
  statusInfo: 'Loading, please wait...',
  statusProgress: '',
  tasks,
  tasksTimestamp: 0,
}, storage, /* c8 ignore next */['apiBase', 'apiKey', 'hueEndpoint', 'tasks', 'tasksTimestamp'])
