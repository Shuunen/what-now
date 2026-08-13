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
  /** mirrored here from useOfflineStatus (called once in App) so any page can factor it into its status text without opening a second listener */
  isOffline: boolean
  isLoading: boolean
  loadData: (data: AppData) => void
  mergeTasks: (tasks: Task[]) => void
  removeTask: (id: string) => void
  setCoachEnabled: (coachEnabled: boolean) => void
  setCoachLanguage: (coachLanguage: Settings['coachLanguage']) => void
  setFinaleDismissedOn: (finaleDismissedOn: string) => void
  setOffline: (isOffline: boolean) => void
  setOllamaUrl: (ollamaUrl: string) => void
  setStatus: (status: string) => void
  setSyncStatus: (syncStatus: SyncStatus) => void
  setSyncUrl: (syncUrl: string) => void
  setUserName: (userName: string) => void
  setWebhook: (webhook: string) => void
  /** the single source of truth for the app's Status component -- see src/components/status.tsx and useAppStatus, the hook every page calls to publish here */
  status: string
  /** the live status reported by useSync, e.g. mirrored here so components outside the useSync call site (Settings, the offline indicator) can read it without opening a second sync connection */
  syncStatus: SyncStatus
  toggleTask: (id: string) => void
  updateTasks: (tasks: Task[]) => void
}

export const useAppStore = create<AppStore>()(
  subscribeWithSelector(set => ({
    addTask: fields => set(state => ({ data: { ...state.data, tasks: [createTask(fields), ...state.data.tasks] } })),
    data: defaultAppData,
    isLoading: true,
    isOffline: false,
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
    removeTask: id => set(state => ({ data: { ...state.data, tasks: state.data.tasks.map(task => (task.id === id ? deleteTask(task) : task)) } })),
    setCoachEnabled: coachEnabled => set(state => ({ data: { ...state.data, settings: { ...state.data.settings, coachEnabled } } })),
    setCoachLanguage: coachLanguage => set(state => ({ data: { ...state.data, settings: { ...state.data.settings, coachLanguage } } })),
    setFinaleDismissedOn: finaleDismissedOn => set(state => ({ data: { ...state.data, settings: { ...state.data.settings, finaleDismissedOn } } })),
    setOffline: isOffline => set({ isOffline }),
    setOllamaUrl: ollamaUrl => set(state => ({ data: { ...state.data, settings: { ...state.data.settings, ollamaUrl } } })),
    setStatus: status => set({ status }),
    setSyncStatus: syncStatus => set({ syncStatus }),
    setSyncUrl: syncUrl => set(state => ({ data: { ...state.data, settings: { ...state.data.settings, syncUrl } } })),
    setUserName: userName => set(state => ({ data: { ...state.data, settings: { ...state.data.settings, userName } } })),
    setWebhook: webhook => set(state => ({ data: { ...state.data, settings: { ...state.data.settings, webhook } } })),
    status: '',
    syncStatus: 'off',
    toggleTask: id => set(state => ({ data: { ...state.data, tasks: state.data.tasks.map(task => (task.id === id ? toggleComplete(task) : task)) } })),
    updateTasks: tasks =>
      set(state => {
        const patchById = new Map(tasks.map(task => [task.id, task]))
        return { data: { ...state.data, tasks: state.data.tasks.map(task => patchById.get(task.id) ?? task) } }
      }),
  })),
)
