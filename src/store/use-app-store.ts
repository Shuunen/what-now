import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { type AppData, defaultAppData } from '../schemas/app-data'
import type { Task } from '../schemas/task'
import { createTask, deleteTask, type NewTaskFields, toggleComplete } from '../utils/tasks.utils'

type AppStore = {
  addTask: (fields: NewTaskFields) => void
  data: AppData
  isLoading: boolean
  loadData: (data: AppData) => void
  removeTask: (id: string) => void
  setFinaleDismissedOn: (finaleDismissedOn: string) => void
  setUserName: (userName: string) => void
  setWebhook: (webhook: string) => void
  toggleTask: (id: string) => void
  updateTasks: (tasks: Task[]) => void
}

export const useAppStore = create<AppStore>()(
  subscribeWithSelector(set => ({
    addTask: fields =>
      set(state => ({
        data: { ...state.data, tasks: [createTask(fields), ...state.data.tasks] },
      })),
    data: defaultAppData,
    isLoading: true,
    loadData: data => set({ data, isLoading: false }),
    removeTask: id =>
      set(state => ({
        data: { ...state.data, tasks: state.data.tasks.map(task => (task.id === id ? deleteTask(task) : task)) },
      })),
    setFinaleDismissedOn: finaleDismissedOn =>
      set(state => ({
        data: { ...state.data, settings: { ...state.data.settings, finaleDismissedOn } },
      })),
    setUserName: userName =>
      set(state => ({
        data: { ...state.data, settings: { ...state.data.settings, userName } },
      })),
    setWebhook: webhook =>
      set(state => ({
        data: { ...state.data, settings: { ...state.data.settings, webhook } },
      })),
    toggleTask: id =>
      set(state => ({
        data: { ...state.data, tasks: state.data.tasks.map(task => (task.id === id ? toggleComplete(task) : task)) },
      })),
    updateTasks: tasks =>
      set(state => {
        const patchById = new Map(tasks.map(task => [task.id, task]))
        return { data: { ...state.data, tasks: state.data.tasks.map(task => patchById.get(task.id) ?? task) } }
      }),
  })),
)
