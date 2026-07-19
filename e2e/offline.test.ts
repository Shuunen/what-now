import { expect, test } from '@playwright/test'

test('going offline shows the offline warning, coming back online hides it', async ({ context, page }) => {
  await page.goto('/')
  await expect(page.getByTestId('offline-warning')).toBeHidden()
  await context.setOffline(true)
  await expect(page.getByTestId('offline-warning')).toBeVisible()
  await expect(page.getByTestId('offline-warning')).toContainText("You're offline, changes are saved on this device")
  await context.setOffline(false)
  await expect(page.getByTestId('offline-warning')).toBeHidden()
})
