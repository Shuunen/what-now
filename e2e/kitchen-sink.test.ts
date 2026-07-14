import { expect, test } from '@playwright/test'

test('kitchen sink page renders all showcase sections', async ({ page }) => {
  await page.goto('/kitchen-sink')
  await expect(page.getByTestId('page-kitchen-sink')).toBeVisible()
  await expect(page.getByTestId('button-default-default')).toBeVisible()
  await expect(page.getByTestId('button-success-default')).toBeVisible()
})

test('about page links to the kitchen sink and navigates there', async ({ page }) => {
  await page.goto('/about')
  await page.getByTestId('link-kitchen-sink').click()
  await expect(page.getByTestId('page-kitchen-sink')).toBeVisible()
  await expect(page).toHaveURL(/\/kitchen-sink/u)
})
