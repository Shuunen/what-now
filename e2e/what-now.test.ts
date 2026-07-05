import { expect, test } from '@playwright/test'

test('home page loads and shows the app title', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('page-tasks')).toBeVisible()
})
