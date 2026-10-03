import { expect, test } from '@playwright/test'
import { waitForMainHydration } from './main-app-helpers'

test.use({ launchOptions: { args: ['--no-proxy-server'] } })

const creatorForm = '#note-creator form'

test.beforeEach(async ({ page }) => {
  await page.goto('/notes', { waitUntil: 'domcontentloaded' })
  await waitForMainHydration(page)
  await page.getByText('Take a note...').click()
  await expect(page.locator(creatorForm)).toBeVisible()
})

test('opens dropdown and keeps the box open', async ({ page }) => {
  await page.locator('#note-creator button[title="More options"]').click()
  await expect(page.locator('[data-radix-menu-content]')).toBeVisible()
  await expect(page.locator(creatorForm)).toBeVisible()
})

test('More options: Checklist toggles the editor without closing the box', async ({ page }) => {
  await page.locator('#note-creator button[title="More options"]').click()
  await page.getByRole('menuitem', { name: 'Checklist' }).click()

  await expect(page.locator(creatorForm)).toBeVisible()
  await expect(page.getByPlaceholder('New item')).toBeVisible()
  // the label flips, proving the handler ran
  await expect(page.getByRole('menuitem', { name: 'Text mode' })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.locator('[data-radix-menu-content]')).toBeHidden()
  await expect(page.getByPlaceholder('New item')).toBeVisible()
})

test('More options: Drawing canvas survives clicks inside it', async ({ page }) => {
  await page.locator('#note-creator button[title="More options"]').click()
  await page.getByRole('menuitem', { name: 'Drawing' }).click()

  const canvas = page.locator('canvas')
  await expect(canvas).toBeVisible()

  // clicking toolbar controls / canvas must NOT dismiss the note box
  await page.locator('button[title="Eraser"]').click({ force: true })
  await expect(canvas).toBeVisible()
  await expect(page.locator(creatorForm)).toBeVisible()

  await canvas.click({ position: { x: 20, y: 20 }, force: true })
  await expect(canvas).toBeVisible()
  await expect(page.locator(creatorForm)).toBeVisible()

  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(canvas).toBeHidden()
  await expect(page.locator(creatorForm)).toBeVisible()
})

test('Palette dropdown applies a colour and keeps the box open', async ({ page }) => {
  await page.locator('#note-creator button[title="Palette"]').click()
  await expect(page.locator('[data-radix-menu-content]')).toBeVisible()

  await page.locator('[data-radix-menu-content] button[title="coral"]').click()
  await expect(page.locator(creatorForm)).toBeVisible()
})

test('Format text dropdown applies formatting and keeps the box open', async ({ page }) => {
  await page.locator('#note-creator button[title="Format text"]').click()
  await page.getByRole('menuitem', { name: 'Bold' }).click()
  await expect(page.locator(creatorForm)).toBeVisible()
})

test('Reminder dropdown: typing a date keeps the box open', async ({ page }) => {
  await page.locator('#note-creator button[title="Add reminder"]').click()
  await expect(page.locator('[data-radix-menu-content]')).toBeVisible()

  await page.locator('[data-radix-menu-content] input[type="datetime-local"]').fill('2030-01-01T10:00')
  await expect(page.locator(creatorForm)).toBeVisible()
})

test('genuine outside click still closes the box', async ({ page }) => {
  await page.locator('body').click({ position: { x: 5, y: 5 }, force: true })
  await expect(page.locator(creatorForm)).toBeHidden()
})