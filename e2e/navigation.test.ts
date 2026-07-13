import { expect, test } from '@playwright/test'
import { mockAppwrite, taskRow } from './mock-appwrite'

test('when not setup, the menu offers all pages', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('floating-menu-trigger').click()
  await expect(page.getByTestId('menu-item-tasks')).toBeVisible()
  await expect(page.getByTestId('menu-item-settings')).toBeVisible()
  await expect(page.getByTestId('menu-item-planner')).toBeVisible()
  await expect(page.getByTestId('menu-item-about')).toBeVisible()
})

test('once setup, the menu offers all pages and navigates between them', async ({ page }) => {
  await mockAppwrite(page, [taskRow({ name: 'water plants' })])
  await page.goto('/#e2e-database&e2e-collection')
  await expect(page.getByTestId('page-tasks')).toBeVisible()

  await page.getByTestId('floating-menu-trigger').click()
  await page.getByTestId('menu-item-planner').click()
  await expect(page.getByTestId('page-planner')).toBeVisible()
  await expect(page).toHaveURL(/\/planner/u)

  await page.getByTestId('floating-menu-trigger').click()
  await page.getByTestId('menu-item-settings').click()
  await expect(page.getByTestId('page-settings')).toBeVisible()

  await page.getByTestId('floating-menu-trigger').click()
  await page.getByTestId('menu-item-about').click()
  await expect(page.getByTestId('page-about')).toBeVisible()

  await page.getByTestId('floating-menu-trigger').click()
  await page.getByTestId('menu-item-tasks').click()
  await expect(page.getByTestId('page-tasks')).toBeVisible()
})

test('the current page action is disabled in the menu', async ({ page }) => {
  await mockAppwrite(page, [taskRow({ name: 'water plants' })])
  await page.goto('/#e2e-database&e2e-collection')
  await page.getByTestId('floating-menu-trigger').click()
  await expect(page.getByTestId('menu-item-tasks')).toHaveAttribute('data-disabled', 'true')
  await expect(page.getByTestId('menu-item-planner')).toHaveAttribute('data-disabled', 'false')
})
