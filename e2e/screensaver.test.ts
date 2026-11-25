import { expect, test } from '@playwright/test'
import { persistenceDebounceMs, seedApp } from './seed'

const idleSeconds = 5
const idleTimeoutMs = (idleSeconds + 5) * 1000
const screensaverSettings = { screensaverIdleSeconds: idleSeconds }

test('the screensaver delay setting is saved', async ({ page }) => {
  await page.goto('/settings')
  await expect(page.getByTestId('input-screensaver-delay')).toHaveValue('60')
  await page.getByTestId('input-screensaver-delay').fill('15')
  await page.waitForTimeout(persistenceDebounceMs)
  await page.reload()
  await expect(page.getByTestId('input-screensaver-delay')).toHaveValue('15')
})

test('the screensaver also shows in portrait', async ({ page }) => {
  await page.setViewportSize({ height: 800, width: 400 })
  await seedApp(page, { settings: screensaverSettings, tasks: [{ name: 'water plants' }] })
  await expect(page.getByTestId('screensaver')).toBeVisible({ timeout: idleTimeoutMs })
})

test('the screensaver shows the remaining tasks once idle, and a touch brings the tasks back', async ({ page }) => {
  await seedApp(page, { settings: screensaverSettings, tasks: [{ name: 'water plants' }, { name: 'walk the dog' }] })
  await expect(page.getByTestId('screensaver')).toBeVisible({ timeout: idleTimeoutMs })
  await expect(page.getByTestId('screensaver-count')).toHaveText('2')
  await page.getByTestId('screensaver').click()
  await expect(page.getByTestId('screensaver')).toBeHidden()
  await expect(page.getByTestId('button-water-plants')).toBeVisible()
})

test('the screensaver turns into a clock once every task is done', async ({ page }) => {
  await seedApp(page, { settings: { ...screensaverSettings, finaleDismissedOn: new Date().toISOString().slice(0, 10) }, tasks: [{ name: 'water plants' }] })
  await page.getByTestId('button-water-plants').click()
  await expect(page.getByTestId('screensaver-clock')).toBeVisible({ timeout: idleTimeoutMs })
  await expect(page.getByTestId('screensaver-clock-time')).toHaveText(/\d{2}.\d{2}/u)
  await expect(page.getByTestId('screensaver-count')).toBeHidden()
})
