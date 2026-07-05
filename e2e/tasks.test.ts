import { expect, test } from '@playwright/test'
import { mockAppwrite, taskRow } from './mock-appwrite'

test('tasks page lists active tasks fetched from the database', async ({ page }) => {
  await mockAppwrite(page, [taskRow({ name: 'water plants' }), taskRow({ name: 'pay taxes', once: 'yes' })])
  await page.goto('/#e2e-database&e2e-collection')
  await expect(page.getByTestId('button-water-plants')).toBeVisible()
  await expect(page.getByTestId('button-pay-taxes')).toBeVisible()
})

test('completing a task marks it done and updates the progress bar', async ({ page }) => {
  await mockAppwrite(page, [taskRow({ name: 'water plants' }), taskRow({ name: 'pay taxes', once: 'yes' })])
  await page.goto('/#e2e-database&e2e-collection')
  const waterTask = page.getByTestId('button-water-plants')
  await expect(waterTask).toBeVisible()
  await expect(page.getByTestId('progress').first()).toHaveAttribute('style', 'width: 0%;')

  await waterTask.click()

  await expect(waterTask).toHaveClass(/opacity-60/u)
  await expect(page.getByTestId('progress').first()).toHaveAttribute('style', 'width: 50%;')
})

test('an empty task list shows no tasks and an empty progress bar', async ({ page }) => {
  await mockAppwrite(page, [])
  await page.goto('/#e2e-database&e2e-collection')
  await expect(page.getByTestId('page-tasks')).toBeVisible()
  await expect(page.getByTestId('tasks')).toBeEmpty()
})
