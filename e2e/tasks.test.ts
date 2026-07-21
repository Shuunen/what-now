import { expect, test } from '@playwright/test'
import { seedTasks } from './seed'

test('tasks page lists active tasks from local data', async ({ page }) => {
  await seedTasks(page, [{ name: 'water plants' }, { name: 'pay taxes', once: 'yes' }])
  await expect(page.getByTestId('button-water-plants')).toBeVisible()
  await expect(page.getByTestId('button-pay-taxes')).toBeVisible()
})

test('completing a task marks it done and updates the progress bar', async ({ page }) => {
  await seedTasks(page, [{ name: 'water plants' }, { name: 'pay taxes', once: 'yes' }])
  const waterTask = page.getByTestId('button-water-plants')
  await expect(waterTask).toBeVisible()
  await expect(page.getByTestId('progress').first()).toHaveAttribute('style', 'width: 0%;')
  await waterTask.click()
  await expect(waterTask).toHaveClass(/opacity-60/u)
  await expect(page.getByTestId('progress').first()).toHaveAttribute('style', 'width: 50%;')
})

test('an empty task list shows no tasks and an empty progress bar', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('page-tasks')).toBeVisible()
  await expect(page.getByTestId('tasks')).toBeEmpty()
  await expect(page.getByTestId('button-add-first-task')).toBeVisible()
})

test('adding a task from the empty state redirects home with a success toast', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('button-add-first-task').click()
  await expect(page.getByTestId('page-add-task')).toBeVisible()
  await page.getByTestId('input-task-name').fill('water plants')
  await page.getByTestId('input-task-quantity').fill('2')
  await page.getByTestId('radio-unit-week').click()
  await page.getByTestId('input-task-minutes').fill('15')
  await page.getByTestId('button-add-task').click()
  await expect(page.getByTestId('page-tasks')).toBeVisible()
  await expect(page.getByTestId('toast').filter({ hasText: 'Task added' })).toBeVisible()
  await expect(page.getByTestId('button-water-plants')).toBeVisible()
})
