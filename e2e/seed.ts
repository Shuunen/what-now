import type { Page } from '@playwright/test'
import { nbMsInDay } from 'shuutils'
import { debounceMs } from '../src/db/persistence-debounce'

const persistenceMargin = 100

/** margin above the app's persistence debounce, so e2e tests can wait past it without depending on a hardcoded duplicate of the value */
export const persistenceDebounceMs = debounceMs + persistenceMargin

export type SeedTask = {
  completedOn?: string
  id?: string
  isDone?: boolean
  minutes?: number
  name: string
  once?: string
  reason?: string
}

const isoDateLength = 10
const defaultDaysAgo = 2

/**
 * task.completedOn is compared against a date-only string, so fixtures must use date-only strings too.
 * @param days - how many days ago
 * @returns a date-only ISO string (YYYY-MM-DD)
 */
export function daysAgoIso10(days: number) {
  return new Date(Date.now() - days * nbMsInDay).toISOString().slice(0, isoDateLength)
}

/**
 * Build a full task from partial fields, deriving a stable id from the name.
 * @param fields - the task fields to override, name is required
 * @returns a complete task
 */
export function task(fields: SeedTask) {
  return {
    completedOn: daysAgoIso10(defaultDaysAgo),
    id: fields.name.toLowerCase().replaceAll(/\s+/gu, '-'),
    isDone: false,
    minutes: 10,
    once: 'day',
    ...fields,
  }
}

/**
 * Seed the app's local tasks by importing them through the settings page, then land on the given path.
 * @param page - the Playwright page
 * @param tasks - the tasks to import
 * @param path - the path to end up on, defaults to the tasks page
 */
export async function seedTasks(page: Page, tasks: SeedTask[], path = '/') {
  const appData = { settings: { finaleDismissedOn: '', webhook: '' }, tasks: tasks.map(fields => task(fields)) }
  await page.goto('/settings')
  await page.getByTestId('file-input').setInputFiles({ buffer: globalThis.Buffer.from(JSON.stringify(appData)), mimeType: 'application/json', name: 'seed.json' })
  await page.locator('.shu-toast', { hasText: 'Data imported' }).waitFor()
  // let the persistence debounce flush the imported data to IndexedDB before we reload onto the target page
  await page.waitForTimeout(persistenceDebounceMs)
  await page.goto(path)
}
