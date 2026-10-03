import { expect, test } from '@playwright/test'
import { waitForMainHydration } from './main-app-helpers'

test.describe('Image Upload', () => {
  test.beforeEach(async ({ page }) => {
    // The session comes from the shared storageState (see main-app-global-setup)
    await page.goto('/notes')
    await waitForMainHydration(page)
  })

  test('should have a file upload input for note images', async ({ page }) => {
    await page.getByText('Take a note...').click()

    // The file input should be present (might be hidden)
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput.first()).toBeAttached()
  })

  test('should show uploaded image in the note preview', async ({ page }) => {
    await page.getByText('Take a note...').click()

    // A real 1x1 PNG — the server re-encodes with sharp, which rejects
    // hand-crafted "minimal" files.
    const filePayload = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64',
    )

    // Upload via the (hidden) file input — setInputFiles works on hidden inputs
    // and fires the change event that triggers the upload.
    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: filePayload,
    })

    // Wait for upload to complete and image preview to appear
    await page.waitForTimeout(2000)

    // Should show an image preview in the note creator
    await expect(page.getByAltText('Notes Image')).toBeVisible({ timeout: 10000 })
  })

  test('should attach image to note and persist after save', async ({ page }) => {
    await page.getByText('Take a note...').click()

    // Fill in a title
    await page.getByPlaceholder('Title').fill('Note With Image Test')

    // A real 1x1 PNG — the server re-encodes with sharp, which rejects
    // hand-crafted "minimal" files.
    const filePayload = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64',
    )

    // Upload an image via the (hidden) file input — setInputFiles fires the
    // change event even on hidden inputs, triggering the upload.
    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: filePayload,
    })

    await page.waitForTimeout(2000)

    // Close the note creator to save
    await page.locator('button').filter({ hasText: /close/i }).click()
    await page.waitForTimeout(1000)

    // Re-open the note to verify image persists
    const note = page.getByText('Note With Image Test').first()
    await note.click()
    await page.waitForTimeout(500)

    // The note creator should show the image again
    await expect(page.getByAltText('Notes Image')).toBeVisible({ timeout: 5000 })
  })

  test('should upload avatar in profile settings', async ({ page }) => {
    await page.goto('/user/profile')

    // The file input should be present for avatar upload
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toBeAttached()
  })
})
