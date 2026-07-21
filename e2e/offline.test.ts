import { expect, test } from '@playwright/test'
import { persistenceDebounceMs } from './seed'

test('going offline shows the offline warning, coming back online hides it', async ({ context, page }) => {
  await page.goto('/')
  await expect(page.getByTestId('offline-warning')).toBeHidden()
  await context.setOffline(true)
  await expect(page.getByTestId('offline-warning')).toBeVisible()
  await expect(page.getByTestId('offline-warning')).toContainText("You're offline, changes are saved on this device")
  await context.setOffline(false)
  await expect(page.getByTestId('offline-warning')).toBeHidden()
})

test('going offline with sync configured mentions that sync will resume', async ({ context, page }) => {
  const appData = { settings: { finaleDismissedOn: '', syncUrl: 'https://example.convex.cloud', userName: 'Me', webhook: '' }, tasks: [] }
  await page.goto('/settings')
  await page.getByTestId('file-input').setInputFiles({ buffer: globalThis.Buffer.from(JSON.stringify(appData)), mimeType: 'application/json', name: 'seed.json' })
  await page.getByTestId('toast').filter({ hasText: 'Data imported' }).waitFor()
  await page.waitForTimeout(persistenceDebounceMs)
  await context.setOffline(true)
  await expect(page.getByTestId('offline-warning')).toContainText('sync will resume when back online')
  await context.setOffline(false)
})
