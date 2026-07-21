import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { SyncStatus } from '../db/sync-status'
import { type AppData, defaultAppData } from '../schemas/app-data'
import type { Task } from '../schemas/task'
import { createTask, deleteTask, type NewTaskFields, toggleComplete } from '../utils/tasks.utils'

type AppStore = {
  addTask: (fields: NewTaskFields) => void
  data: AppData
  isLoading: boolean
  loadData: (data: AppData) => void
  mergeTasks: (tasks: Task[]) => void
  removeTask: (id: string) => void
  setFinaleDismissedOn: (finaleDismissedOn: string) => void
  setSyncStatus: (syncStatus: SyncStatus) => void
  setSyncUrl: (syncUrl: string) => void
  setUserName: (userName: string) => void
  setWebhook: (webhook: string) => void
  /** the live status reported by useSync, e.g. mirrored here so components outside the useSync call site (Settings, the offline indicator) can read it without opening a second sync connection */
  syncStatus: SyncStatus
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
    // like updateTasks, but also appends any task not already present locally by id — used by sync
    // to adopt a brand-new remote-only task, which a plain patch-by-id update can't do
    mergeTasks: tasks =>
      set(state => {
        const patchById = new Map(tasks.map(task => [task.id, task]))
        const existingIds = new Set(state.data.tasks.map(task => task.id))
        const patchedExisting = state.data.tasks.map(task => patchById.get(task.id) ?? task)
        const newlyAdopted = tasks.filter(task => !existingIds.has(task.id))
        return { data: { ...state.data, tasks: [...patchedExisting, ...newlyAdopted] } }
      }),
    removeTask: id =>
      set(state => ({
        data: { ...state.data, tasks: state.data.tasks.map(task => (task.id === id ? deleteTask(task) : task)) },
      })),
    setFinaleDismissedOn: finaleDismissedOn =>
      set(state => ({
        data: { ...state.data, settings: { ...state.data.settings, finaleDismissedOn } },
      })),
    setSyncStatus: syncStatus => set({ syncStatus }),
    setSyncUrl: syncUrl =>
      set(state => ({
        data: { ...state.data, settings: { ...state.data.settings, syncUrl } },
      })),
    setUserName: userName =>
      set(state => ({
        data: { ...state.data, settings: { ...state.data.settings, userName } },
      })),
    setWebhook: webhook =>
      set(state => ({
        data: { ...state.data, settings: { ...state.data.settings, webhook } },
      })),
    syncStatus: 'off',
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
