import { expect, test } from '@playwright/test'
import { persistenceDebounceMs, seedTasks } from './seed'

test('completing every task shows the finale celebration, dismissible by click', async ({ page }) => {
  await seedTasks(page, [{ name: 'water plants' }])
  await page.getByTestId('button-water-plants').click()
  await expect(page.getByTestId('finale')).toBeVisible()
  await page.getByTestId('finale').click()
  await expect(page.getByTestId('finale')).toBeHidden()
})

test('the finale does not celebrate again on reload the same day once already dismissed', async ({ page }) => {
  await seedTasks(page, [{ name: 'water plants' }])
  await page.getByTestId('button-water-plants').click()
  await expect(page.getByTestId('finale')).toBeVisible()
  await page.getByTestId('finale').click()
  await expect(page.getByTestId('finale')).toBeHidden()
  // the completed task and the same-day dismissal are persisted to IndexedDB behind a debounce,
  // so wait for that write to flush before reloading to reuse the still-all-done, already-dismissed state
  await page.waitForTimeout(persistenceDebounceMs)
  await page.reload()
  await expect(page.getByTestId('page-tasks')).toBeVisible()
  await expect(page.getByTestId('finale')).toBeHidden()
})
