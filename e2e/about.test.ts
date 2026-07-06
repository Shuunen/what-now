import { expect, test } from '@playwright/test'

test('about page explains the app and links to the source repo', async ({ page }) => {
  await page.goto('/about')
  await expect(page.getByTestId('page-about')).toBeVisible()
  await expect(page.getByTestId('page-about')).toContainText('open-source code')
  await expect(page.getByTestId('page-about').locator('a')).toHaveAttribute('href', 'https://github.com/Shuunen/what-now')
})
