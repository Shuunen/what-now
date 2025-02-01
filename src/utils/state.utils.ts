import { createState, storage } from 'shuutils'
import type { Task } from '../types'

const tasks: Task[] = []

export const { state, watchState } = createState({
  apiCollection: '',
  apiDatabase: '',
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
}, storage, /* c8 ignore next */['apiDatabase', 'apiCollection', 'hueEndpoint', 'tasks', 'tasksTimestamp'])

export type CredentialField = keyof Pick<typeof state, 'apiCollection' | 'apiDatabase' | 'hueEndpoint'>
