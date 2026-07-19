import { Dexie, type Table } from 'dexie'
import type { AppData } from '../schemas/app-data'

export type AppDataRecord = {
  data: AppData
  id: number
}

/** the single record id under which the whole app state is stored */
export const appDataId = 1

class AppDataDb extends Dexie {
  public appdata!: Table<AppDataRecord>

  public constructor() {
    super('what-now-app')
    this.version(1).stores({ appdata: 'id' })
  }
}

export const db = new AppDataDb()
