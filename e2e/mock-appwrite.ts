import type { Page } from '@playwright/test'
import { nbMsInDay } from 'shuutils'

export type MockRow = {
  $id: string
  'completed-on': string
  done: boolean
  minutes: number
  name: string
  once: string
  reason?: string
}

const defaultDaysAgo = 2
const isoDateLength = 10

/**
 * task.completedOn is compared against `dateIso10(new Date())` (a date-only string), so fixtures
 * must use date-only strings too, otherwise the time-of-day component skews the day-diff math.
 * @param days - how many days ago
 * @returns a date-only ISO string (YYYY-MM-DD)
 */
export function daysAgoIso10(days: number) {
  return new Date(Date.now() - days * nbMsInDay).toISOString().slice(0, isoDateLength)
}

export function taskRow(fields: Partial<MockRow> & Pick<MockRow, 'name'>): MockRow {
  return {
    $id: fields.name.toLowerCase().replaceAll(/\s+/gu, '-'),
    'completed-on': daysAgoIso10(defaultDaysAgo),
    done: false,
    minutes: 10,
    once: 'day',
    ...fields,
  }
}

/**
 * Mock the Appwrite tablesdb REST endpoints so e2e tests never hit the real cloud.appwrite.io backend.
 * @param page - the Playwright page to intercept requests on
 * @param rows - the rows to return for any "list rows" request
 */
export async function mockAppwrite(page: Page, rows: MockRow[]) {
  await page.route('**/v1/tablesdb/**/rows*', async route => {
    if (route.request().method() !== 'GET') return route.fallback()
    await route.fulfill({ body: JSON.stringify({ rows, total: rows.length }), contentType: 'application/json' })
  })
  await page.route('**/v1/tablesdb/**/rows/*', async route => {
    if (route.request().method() !== 'PATCH') return route.fallback()
    await route.fulfill({ body: JSON.stringify({ $id: 'updated' }), contentType: 'application/json' })
  })
}
