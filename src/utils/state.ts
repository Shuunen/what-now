import { createState, storage } from 'shuutils'
import type { AirtableTask } from '../types'

const tasks: AirtableTask[] = []

export const { state, watchState } = createState({
  apiBase: '',
  apiToken: '',
  hueEndpoint: '',
  isLoading: false,
  isSetup: false,
  showErrorToast: '',
  showInfoToast: '',
  statusError: '',
  statusInfo: 'Loading, please wait...',
  statusProgress: '',
  tasks,
  tasksTimestamp: 0,
}, storage, /* c8 ignore next */['apiBase', 'apiToken', 'hueEndpoint', 'tasks', 'tasksTimestamp'])
