import { expect, test } from '@playwright/test'
import { persistenceDebounceMs, seedTasks } from './seed'

test('settings page shows import/export and webhook controls', async ({ page }) => {
  await page.goto('/settings')
  await expect(page.getByTestId('page-settings')).toBeVisible()
  await expect(page.getByTestId('import-export')).toBeVisible()
  await expect(page.getByTestId('button-import')).toBeVisible()
  await expect(page.locator('#input-webhook')).toBeVisible()
})

test('the export button is disabled until there is data to export', async ({ page }) => {
  await page.goto('/settings')
  await expect(page.getByTestId('button-export')).toBeDisabled()
})

test('importing a data file loads the tasks and enables export', async ({ page }) => {
  await seedTasks(page, [{ name: 'water plants' }], '/settings')
  await expect(page.getByTestId('button-export')).toBeEnabled()
  await page.goto('/')
  await expect(page.getByTestId('button-water-plants')).toBeVisible()
})

test('the webhook field accepts a value', async ({ page }) => {
  await page.goto('/settings')
  await page.locator('#input-webhook').fill('https://example.com/hook')
  await expect(page.locator('#input-webhook')).toHaveValue('https://example.com/hook')
})

test('setting the user name updates the quote form attribution on the planner', async ({ page }) => {
  await seedTasks(page, [{ name: 'water plants' }], '/settings')
  await page.locator('#input-name').fill('Alice')
  await expect(page.locator('#input-name')).toHaveValue('Alice')
  await page.waitForTimeout(persistenceDebounceMs)
  await page.goto('/planner')
  await expect(page.getByTestId('quote-author')).toContainText('Alice')
})

test('importing an invalid file shows an error toast and keeps existing data', async ({ page }) => {
  await seedTasks(page, [{ name: 'water plants' }], '/settings')
  await page.getByTestId('file-input').setInputFiles({ buffer: globalThis.Buffer.from('not json'), mimeType: 'application/json', name: 'broken.json' })
  await page.locator('.shu-toast', { hasText: 'Invalid JSON' }).waitFor()
  await page.goto('/')
  await expect(page.getByTestId('button-water-plants')).toBeVisible()
})
