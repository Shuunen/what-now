import { expect, test } from '@playwright/test'

test('the menu offers all pages', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('floating-menu-trigger').click()
  await expect(page.getByTestId('menu-item-tasks')).toBeVisible()
  await expect(page.getByTestId('menu-item-settings')).toBeVisible()
  await expect(page.getByTestId('menu-item-planner')).toBeVisible()
  await expect(page.getByTestId('menu-item-about')).toBeVisible()
})

test('the menu navigates between pages', async ({ page }) => {
  await page.goto('/')
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
  await page.goto('/')
  await page.getByTestId('floating-menu-trigger').click()
  await expect(page.getByTestId('menu-item-tasks')).toHaveAttribute('data-disabled', 'true')
  await expect(page.getByTestId('menu-item-planner')).toHaveAttribute('data-disabled', 'false')
})

test('hovering the trigger opens the menu, and moving away closes it after a delay', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('floating-menu-trigger').hover()
  await expect(page.getByTestId('menu-item-tasks')).toBeVisible()
  await page.mouse.move(0, 0)
  await expect(page.getByTestId('menu-item-tasks')).toBeHidden()
})
