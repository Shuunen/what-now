import { expect, test } from '@playwright/test'

test('settings page shows the credentials form', async ({ page }) => {
  await page.goto('/settings')
  await expect(page.getByTestId('page-settings')).toBeVisible()
  await expect(page.getByTestId('credentials')).toBeVisible()
  await expect(page.locator('#input-appwrite-database-id')).toBeVisible()
  await expect(page.locator('#input-appwrite-collection-id')).toBeVisible()
  await expect(page.locator('#input-webhook')).toBeVisible()
})

test('submitting an over-long database id shows an error and keeps the user on settings', async ({ page }) => {
  await page.goto('/settings')
  const tooLongId = 'a'.repeat(40) // valid characters, but exceeds validateCredentials' 36-char limit
  await page.locator('#input-appwrite-database-id').fill(tooLongId)
  await page.locator('#input-appwrite-collection-id').fill(tooLongId)
  await page.getByTestId('button-save-credentials').click()
  await expect(page.getByTestId('status')).toContainText('Invalid credentials')
  await expect(page).toHaveURL(/\/settings/u)
})

test('submitting valid credentials redirects to the tasks page', async ({ page }) => {
  await page.route('**/v1/tablesdb/**/rows*', async route => {
    await route.fulfill({ body: JSON.stringify({ rows: [], total: 0 }), contentType: 'application/json' })
  })
  await page.goto('/settings')
  await page.locator('#input-appwrite-database-id').fill('e2e-database')
  await page.locator('#input-appwrite-collection-id').fill('e2e-collection')
  await page.getByTestId('button-save-credentials').click()
  await expect(page.getByTestId('page-tasks')).toBeVisible()
})
