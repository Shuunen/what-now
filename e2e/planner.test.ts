import { expect, test } from '@playwright/test'
import { persistenceDebounceMs, seedTasks } from './seed'

test('planner page shows an import prompt when there are no tasks', async ({ page }) => {
  await page.goto('/planner')
  await expect(page.getByTestId('page-planner')).toContainText('settings')
  await expect(page.getByTestId('task-card-water-plants')).toHaveCount(0)
})

test('planner page shows a weekly grid for the loaded tasks', async ({ page }) => {
  await seedTasks(page, [{ name: 'water plants' }, { name: 'pay taxes', once: 'yes' }], '/planner')
  await expect(page.getByTestId('page-planner')).toBeVisible()
  await expect(page.getByTestId('task-card-water-plants').first()).toBeVisible()
})

test('increasing a task frequency marks it modified and enables saving', async ({ page }) => {
  await seedTasks(page, [{ name: 'water plants', once: '2-days' }], '/planner')
  const card = page.getByTestId('task-card-water-plants').first()
  await expect(card).toBeVisible()
  await expect(page.getByTestId('button-save')).toBeHidden()
  await card.getByTestId('button-increase').click()
  await expect(card).toHaveClass(/ring-2/u)
  await expect(page.getByTestId('button-save')).toBeVisible()
})

test('saving modifications persists them and clears the unsaved state', async ({ page }) => {
  await seedTasks(page, [{ name: 'water plants', once: '2-days' }], '/planner')
  const card = page.getByTestId('task-card-water-plants').first()
  await expect(card).toBeVisible()
  await card.getByTestId('button-increase').click()
  await page.getByTestId('button-save').click()
  await expect(page.getByTestId('button-save')).toBeHidden()
})

test('saved frequency and name edits survive a reload', async ({ page }) => {
  await seedTasks(page, [{ name: 'water plants', once: '2-days' }], '/planner')
  const card = page.getByTestId('task-card-water-plants').first()
  await card.click()
  await card.getByTestId('button-increase').click()
  await page.getByTestId('input-task-name').fill('water the plants')
  await page.getByTestId('button-save').click()
  await page.waitForTimeout(persistenceDebounceMs)
  await page.reload()
  await expect(page.getByTestId('task-card-water-the-plants').first()).toContainText('daily')
})

test('the inline quote form shows the first task by default with no task selected', async ({ page }) => {
  await seedTasks(page, [{ minutes: 15, name: 'water plants', once: '2-days' }], '/planner')
  const card = page.getByTestId('task-card-water-plants').first()
  await expect(card).toBeVisible()
  await expect(card).toHaveAttribute('data-selected', 'false')
  await expect(page.getByTestId('task-quote-form')).toBeVisible()
  await expect(page.getByTestId('input-task-name')).toHaveValue('water plants')
  await expect(page.getByTestId('input-task-quantity')).toHaveValue('2')
  await card.click()
  await expect(card).toHaveAttribute('data-selected', 'true')
  await expect(page.getByTestId('task-quote-form')).toBeVisible()
})

test('switching the quote form unit keeps the quantity and shows a readable card label', async ({ page }) => {
  await seedTasks(page, [{ name: 'water plants', once: '2-weeks' }], '/planner')
  const card = page.getByTestId('task-card-water-plants').first()
  await expect(card).toBeVisible()
  await expect(card).toContainText('2 weeks')
  await expect(page.getByTestId('input-task-quantity')).toHaveValue('2')
  await page.getByTestId('radio-unit-month').click()
  await expect(page.getByTestId('input-task-quantity')).toHaveValue('2')
  await page.getByTestId('radio-unit-year').click()
  await expect(page.getByTestId('input-task-quantity')).toHaveValue('2')
  await expect(page.getByTestId('task-card-water-plants').first()).toContainText('2 years')
})

test('adding a task from the planner shows it on the current day', async ({ page }) => {
  await seedTasks(page, [{ name: 'water plants' }], '/planner')
  await page.getByTestId('button-add-task').click()
  const modal = page.getByTestId('add-task-modal')
  await expect(modal).toBeVisible()
  await modal.getByTestId('input-task-name').fill('call mom')
  await modal.getByTestId('input-task-quantity').fill('2')
  await modal.getByTestId('radio-unit-week').click()
  await page.getByTestId('button-add-task').last().click()
  await expect(page.getByTestId('add-task-modal')).toBeHidden()
  await expect(page.getByTestId('planner-today').getByTestId('task-card-call-mom').first()).toBeVisible()
})

test('the add task modal closes on Escape and on backdrop click', async ({ page }) => {
  await seedTasks(page, [{ name: 'water plants' }], '/planner')
  await page.getByTestId('button-add-task').click()
  await expect(page.getByTestId('add-task-modal')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('add-task-modal')).toBeHidden()
  await page.getByTestId('button-add-task').click()
  await expect(page.getByTestId('add-task-modal')).toBeVisible()
  await page.getByTestId('add-task-modal-backdrop').click({ position: { x: 5, y: 5 } })
  await expect(page.getByTestId('add-task-modal')).toBeHidden()
})

test('editing a task from the inline quote form updates the card live and shares the planner save', async ({ page }) => {
  await seedTasks(page, [{ name: 'water plants', once: '2-days' }], '/planner')
  await page.getByTestId('task-card-water-plants').first().click()
  await page.getByTestId('input-task-name').fill('water the plants')
  await expect(page.getByTestId('task-card-water-the-plants').first()).toBeVisible()
  await expect(page.getByTestId('button-save')).toBeVisible()
  await page.getByTestId('button-save').click()
  await expect(page.getByTestId('task-card-water-the-plants').first()).toBeVisible()
  await expect(page.getByTestId('button-save')).toBeHidden()
})

test('discarding reverts both the buttons edits and the form edits', async ({ page }) => {
  await seedTasks(page, [{ name: 'water plants', once: '2-days' }], '/planner')
  const card = page.getByTestId('task-card-water-plants').first()
  await card.click()
  await card.getByTestId('button-increase').click()
  await page.getByTestId('input-task-name').fill('water the plants')
  await expect(page.getByTestId('task-card-water-the-plants').first()).toBeVisible()
  await page.getByTestId('button-discard').click()
  await expect(page.getByTestId('task-card-water-plants').first()).toBeVisible()
  await expect(page.getByTestId('input-task-name')).toHaveValue('water plants')
  await expect(page.getByTestId('button-discard')).toBeHidden()
  await expect(page.getByTestId('button-save')).toBeHidden()
})
