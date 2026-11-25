import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { SyncStatus } from '../db/sync-status'
import { type AppData, defaultAppData } from '../schemas/app-data'
import type { Settings } from '../schemas/settings'
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
  setNightEnd: (nightEnd: string) => void
  setNightStart: (nightStart: string) => void
  setScreensaverIdleSeconds: (screensaverIdleSeconds: number) => void
  setSyncStatus: (syncStatus: SyncStatus) => void
  setSyncUrl: (syncUrl: string) => void
  setUserName: (userName: string) => void
  setWebhook: (webhook: string) => void
  /** the live status reported by useSync, e.g. mirrored here so components outside the useSync call site (Settings, the offline indicator) can read it without opening a second sync connection */
  syncStatus: SyncStatus
  toggleTask: (id: string) => void
  updateTasks: (tasks: Task[]) => void
}

/**
 * Builds a state update that changes some settings and keeps everything else.
 * @param patch - the settings to change
 * @returns an updater for the store `set` function
 */
const withSettings = (patch: Partial<Settings>) => (state: AppStore) => ({ data: { ...state.data, settings: { ...state.data.settings, ...patch } } })

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
    setFinaleDismissedOn: finaleDismissedOn => set(withSettings({ finaleDismissedOn })),
    setNightEnd: nightEnd => set(withSettings({ nightEnd })),
    setNightStart: nightStart => set(withSettings({ nightStart })),
    setScreensaverIdleSeconds: screensaverIdleSeconds => set(withSettings({ screensaverIdleSeconds })),
    setSyncStatus: syncStatus => set({ syncStatus }),
    setSyncUrl: syncUrl => set(withSettings({ syncUrl })),
    setUserName: userName => set(withSettings({ userName })),
    setWebhook: webhook => set(withSettings({ webhook })),
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
