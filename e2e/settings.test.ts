import { expect, test } from '@playwright/test'
import { persistenceDebounceMs, seedTasks } from './seed'

test('settings page shows import/export and webhook controls', async ({ page }) => {
  await page.goto('/settings')
  await expect(page.getByTestId('page-settings')).toBeVisible()
  await expect(page.getByTestId('import-export')).toBeVisible()
  await expect(page.getByTestId('button-import')).toBeVisible()
  await expect(page.locator('#input-webhook')).toBeVisible()
  await expect(page.getByTestId('setting-sync')).toBeVisible()
})

test('the sync connect button stays disabled until a URL is entered', async ({ page }) => {
  await page.goto('/settings')
  await expect(page.getByTestId('button-connect-sync')).toBeDisabled()
  await page.locator('#input-sync-url').fill('https://example.convex.cloud')
  await expect(page.getByTestId('button-connect-sync')).toBeEnabled()
})

test('connecting to an unreachable sync URL shows an error toast and does not persist it', async ({ page }) => {
  await page.goto('/settings')
  await page.locator('#input-sync-url').fill('https://this-is-not-a-real-deployment.example.invalid')
  await page.getByTestId('button-connect-sync').click()
  await page.getByTestId('toast').filter({ hasText: "doesn't look like a WhatNow sync deployment" }).waitFor()
  await page.reload()
  await expect(page.locator('#input-sync-url')).toBeVisible()
})

test('the delete-synced-data button requires a confirming second click', async ({ page }) => {
  const appData = { settings: { finaleDismissedOn: '', syncUrl: 'https://example.convex.cloud', userName: 'Me', webhook: '' }, tasks: [] }
  await page.goto('/settings')
  await page.getByTestId('file-input').setInputFiles({ buffer: globalThis.Buffer.from(JSON.stringify(appData)), mimeType: 'application/json', name: 'seed.json' })
  await page.getByTestId('toast').filter({ hasText: 'Data imported' }).waitFor()
  await page.waitForTimeout(persistenceDebounceMs)
  await page.reload()
  await expect(page.getByTestId('button-delete-synced-data')).toContainText('Delete my synced data')
  await page.getByTestId('button-delete-synced-data').click()
  await expect(page.getByTestId('button-delete-synced-data')).toContainText('Confirm delete?')
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
  await page.getByTestId('toast').filter({ hasText: 'Invalid JSON' }).waitFor()
  await page.goto('/')
  await expect(page.getByTestId('button-water-plants')).toBeVisible()
})
