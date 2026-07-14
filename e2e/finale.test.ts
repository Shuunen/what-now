import { expect, test } from '@playwright/test'
import { mockAppwrite, taskRow } from './mock-appwrite'

test('completing every task shows the finale celebration, dismissible by click', async ({ page }) => {
  await mockAppwrite(page, [taskRow({ name: 'water plants' })])
  await page.goto('/#e2e-database&e2e-collection')
  await page.getByTestId('button-water-plants').click()
  await expect(page.getByTestId('finale')).toBeVisible()
  await page.getByTestId('finale').click()
  await expect(page.getByTestId('finale')).toBeHidden()
})

test('the finale does not celebrate again on reload the same day once already dismissed', async ({ page }) => {
  await mockAppwrite(page, [taskRow({ name: 'water plants' })])
  await page.goto('/#e2e-database&e2e-collection')
  await page.getByTestId('button-water-plants').click()
  await expect(page.getByTestId('finale')).toBeVisible()
  await page.getByTestId('finale').click()
  await expect(page.getByTestId('finale')).toBeHidden()
  // tasks and their fresh timestamp are persisted to storage, so this reload reuses the still-all-done
  // local task list without refetching, letting us verify the same-day dismissal actually suppresses the finale
  await page.reload()
  await expect(page.getByTestId('page-tasks')).toBeVisible()
  await expect(page.getByTestId('finale')).toBeHidden()
})
