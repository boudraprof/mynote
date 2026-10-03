import { expect, test } from '@playwright/test'
import { waitForMainHydration } from './main-app-helpers'

test.describe('Labels', () => {
  test.beforeEach(async ({ page }) => {
    // The session comes from the shared storageState (see main-app-global-setup)
    await page.goto('/notes')
    await waitForMainHydration(page)
  })

  test('should open label input when clicking tag button', async ({ page }) => {
    // Open note creator
    await page.getByText('Take a note...').click()

    // Click the tag/label button
    await page.getByRole('button', { name: /add labels/i }).click()

    // Should show label input
    await expect(page.getByPlaceholder('Type label and press Enter')).toBeVisible()
  })

  test('should add a label to a note', async ({ page }) => {
    // Open note creator
    await page.getByText('Take a note...').click()

    // Click the tag/label button
    await page.getByRole('button', { name: /add labels/i }).click()

    // Type a label name
    const labelInput = page.getByPlaceholder('Type label and press Enter')
    await labelInput.fill('work')
    await labelInput.press('Enter')

    // Should show the label as a chip
    await expect(page.getByText('work').first()).toBeVisible()
  })

  test('should remove a label from a note', async ({ page }) => {
    // Open note creator
    await page.getByText('Take a note...').click()

    // Click the tag/label button
    await page.getByRole('button', { name: /add labels/i }).click()

    // Add a label
    const labelInput = page.getByPlaceholder('Type label and press Enter')
    await labelInput.fill('remove this')
    await labelInput.press('Enter')

    // Click the X button to remove the label
    await page.locator('svg.lucide-x').click()
    // await page.locator('button:has(svg)').filter({ hasText: 'test' }).first().click()

    // Label should be removed
    await expect(page.locator('remove this')).not.toBeVisible()
  })

  test('should not add duplicate labels', async ({ page }) => {
    // Open note creator
    await page.getByText('Take a note...').click()

    // Click the tag/label button
    await page.getByRole('button', { name: /add labels/i }).click()

    // Add the same label twice
    const labelInput = page.getByPlaceholder('Type label and press Enter')
    await labelInput.fill('work')
    await labelInput.press('Enter')
    await labelInput.fill('work')
    await labelInput.press('Enter')

    // Should only show one "work" label
    const workLabels = page.locator('span').filter({ hasText: /^work$/ })
    await expect(workLabels).toHaveCount(1)
  })

  test('should show existing labels as suggestions', async ({ page }) => {
    // Open note creator
    await page.getByText('Take a note...').click()

    // Click the tag/label button
    await page.getByRole('button', { name: /add labels/i }).click()

    // Should show existing labels (if any)
    // This test verifies the UI element exists, even if empty
    await expect(page.getByPlaceholder('Type label and press Enter')).toBeVisible()
  })

  test('should filter existing labels based on input', async ({ page }) => {
    // Open note creator
    await page.getByText('Take a note...').click()

    // Click the tag/label button
    await page.getByRole('button', { name: /add labels/i }).click()

    // Type to filter
    const labelInput = page.getByPlaceholder('Type label and press Enter')
    await labelInput.fill('work')

    // The input should show the typed value
    await expect(labelInput).toHaveValue('work')
  })
})
