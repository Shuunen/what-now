import { expect, test } from '@playwright/test'
import { mockAppwrite, taskRow } from './mock-appwrite'

test('planner page shows a setup prompt instead of fetching tasks when not set up', async ({ page }) => {
  await page.goto('/planner')
  await expect(page.getByTestId('page-planner')).toContainText('settings')
  await expect(page.getByTestId('task-card-water-plants')).toHaveCount(0)
})

test('planner page shows a weekly grid and metrics for the loaded tasks', async ({ page }) => {
  await mockAppwrite(page, [taskRow({ name: 'water plants' }), taskRow({ name: 'pay taxes', once: 'yes' })])
  await page.goto('/planner#e2e-database&e2e-collection')
  await expect(page.getByTestId('page-planner')).toBeVisible()
  await expect(page.getByTestId('task-card-water-plants').first()).toBeVisible()
})

test('increasing a task frequency marks it modified and enables saving', async ({ page }) => {
  await mockAppwrite(page, [taskRow({ name: 'water plants', once: '2-days' })])
  await page.goto('/planner#e2e-database&e2e-collection')
  const card = page.getByTestId('task-card-water-plants').first()
  await expect(card).toBeVisible()
  await expect(page.getByTestId('button-save')).toBeHidden()

  await card.getByTestId('button-increase').click()

  await expect(card).toHaveClass(/ring-2/u)
  await expect(page.getByTestId('button-save')).toBeVisible()
})

test('saving modifications persists them and clears the unsaved state', async ({ page }) => {
  await mockAppwrite(page, [taskRow({ name: 'water plants', once: '2-days' })])
  await page.goto('/planner#e2e-database&e2e-collection')
  const card = page.getByTestId('task-card-water-plants').first()
  await expect(card).toBeVisible()

  await card.getByTestId('button-increase').click()
  await page.getByTestId('button-save').click()

  await expect(page.getByTestId('button-save')).toBeHidden()
})
