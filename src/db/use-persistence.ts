/* v8 ignore start -- browser-only IndexedDB side-effects, covered by e2e */
import { useEffect } from 'react'
import { toastError } from 'shuutils'
import { type AppData, AppDataSchema, recoverAppData } from '../schemas/app-data'
import { useAppStore } from '../store/use-app-store'
import { logger } from '../utils/logger.utils'
import { appDataId, db } from './db'
import { debounceMs } from './persistence-debounce'

/**
 * Hydrate the store from IndexedDB on mount, falling back to the default empty state.
 */
export function useHydration() {
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const record = await db.appdata.get(appDataId)
        if (cancelled) return
        const raw = record?.data ?? {}
        const result = AppDataSchema.safeParse(raw)
        useAppStore.getState().loadData(result.success ? result.data : recoverAppData(raw))
      } catch (error) {
        logger.error('failed to hydrate from IndexedDB', error)
        toastError('Could not load your saved data from this browser')
        if (!cancelled) useAppStore.getState().loadData(AppDataSchema.parse({}))
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])
}

/**
 * Persist the store data to IndexedDB whenever it changes, debounced. Also kicks off an
 * immediate (still async — IndexedDB has no synchronous write API) flush on pagehide, so a
 * reload or in-app navigation mid-debounce doesn't wait out the full debounce before saving.
 * A hard tab/browser close can still race the write; there is no fully synchronous fallback.
 */
export function usePersistence() {
  useEffect(() => {
    let writeTimer: ReturnType<typeof setTimeout> | undefined = undefined
    let pendingData: AppData | undefined = undefined
    let hasWarnedOnFailure = false
    const persist = async (newData: AppData) => {
      try {
        await db.appdata.put({ data: newData, id: appDataId })
        pendingData = undefined
      } catch (error) {
        logger.error('failed to persist to IndexedDB', error)
        if (!hasWarnedOnFailure) {
          hasWarnedOnFailure = true
          toastError('Could not save your data in this browser')
        }
      }
    }
    const flushPending = () => {
      if (pendingData === undefined) return
      clearTimeout(writeTimer)
      void persist(pendingData)
    }
    const unsubscribe = useAppStore.subscribe(
      state => state.data,
      newData => {
        pendingData = newData
        clearTimeout(writeTimer)
        writeTimer = setTimeout(() => void persist(newData), debounceMs)
      },
    )
    globalThis.addEventListener('pagehide', flushPending)
    return () => {
      unsubscribe()
      clearTimeout(writeTimer)
      globalThis.removeEventListener('pagehide', flushPending)
    }
  }, [])
}
/* v8 ignore stop */
