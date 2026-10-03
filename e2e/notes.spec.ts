import { expect, test } from '@playwright/test'
import { waitForMainHydration } from './main-app-helpers'

// These tests assume the user is logged in
test.describe('Notes', () => {
  test.beforeEach(async ({ page }) => {
    // The session comes from the shared storageState (see main-app-global-setup)
    await page.goto('/notes')
    await waitForMainHydration(page)
  })

  test.describe('Create Note', () => {
    test('should open note creator when clicking "Take a note..."', async ({ page }) => {
      await page.getByText('Take a note...').click()

      await expect(page.getByPlaceholder('Title')).toBeVisible()
      await expect(page.locator("div[data-placeholder='Take a note...']")).toHaveAttribute('data-placeholder')
    })

    test('should create a note with title and content', async ({ page }) => {
      await page.getByText('Take a note...').click()

      await page.getByPlaceholder('Title').fill('Test Note Title')
      await page.locator("div[data-placeholder='Take a note...']").fill('Test Note Content')
      // await page.getByPlaceholder('Take a note...').fill('Test Note Content')

      // Close to save
      await page.getByRole('button', { name: /close/i }).click()

      // Wait for the note to appear
      await expect(page.getByText('Test Note Title').last()).toBeVisible({ timeout: 5000 })
    })

    test('should close creator with Escape key', async ({ page }) => {
      await page.getByText('Take a note...').click()
      await page.getByPlaceholder('Title').fill('Should be discarded')

      await page.keyboard.press('Escape')

      // Creator should be hidden
      await expect(page.getByPlaceholder('Title')).not.toBeVisible()
    })
  })

  test.describe('Edit Note', () => {
    test('should edit note on click', async ({ page }) => {
      // Click on an existing note
      const note = page.getByText('Test Note Title').first()
      await note.click()

      // Should open in edit mode
      await expect(page.getByPlaceholder('Title')).toHaveValue('Test Note Title')
    })

    test('should update note content', async ({ page }) => {
      // Click on an existing note
      await page.getByText('Test Note Title').first().click()

      // Update content
      await page.getByPlaceholder('Title').fill('Updated Note Title')

      // Close to save
      await page.getByRole('button', { name: /close/i }).click()

      // Should show updated title
      await expect(page.getByText('Updated Note Title')).toBeVisible()
    })
  })

  test.describe('Note Features', () => {
    test('should pin a note', async ({ page }) => {
      // Find a note and click the pin button
      // const noteCard = page.locator('[data-testid="note-card"]').first()
       await page.getByText('Take a note...').click()

      await page.getByPlaceholder('Title').fill('this note should be pinned')

      // Close to save
      await page.getByRole('button', { name: /close/i }).click()

   
      // const noteCard =  page.getByText('this note should be pinned').last();
      const noteCard =  page.locator("[data-slot='card']").first()
      await noteCard.hover()
      

      const pinButton = noteCard.getByTitle("pin note").first()
      if (await pinButton.isVisible()) {
        await pinButton.click()

        // Verify pinned state changed
        await expect(noteCard.getByTitle("unpin note").first()).toHaveAttribute('title', 'unpin note')
      }
    })

    test('should move note to trash', async ({ page }) => {
      const noteCard =  page.locator("[data-slot='card']").first()
      // const noteCard = page.getByTitle('move note to trash');
      await noteCard.hover()
      
      await noteCard.getByTitle(/More options/i).click()
      const trashButton = noteCard.getByTitle('move note to trash')
      if (await trashButton.isVisible()) {
        await trashButton.click()

        // Should show undo toast
        await expect(page.getByText(/note moved to trash/i)).toBeVisible()
      }
    })

    test('should archive a note', async ({ page }) => {
      const noteCard =  page.locator("[data-slot='card']").first()
      // const noteCard = page.getByTitle('move note to archive');
      await noteCard.hover()
      
      await noteCard.getByTitle(/More options/i).click()
      const archiveButton = noteCard.getByTitle('move note to archive')
      if (await archiveButton.isVisible()) {
        await archiveButton.click()

        // Should show undo toast
        await expect(page.getByText(/note moved to archive/i)).toBeVisible()
      }
    })
  })

  test.describe('Note Filtering', () => {
    test('should filter notes by label', async ({ page }) => {
      // Click on a label filter
      const labelFilter = page.getByRole('button', { name: /work/i })
      if (await labelFilter.isVisible()) {
        await labelFilter.click()

        // URL should update with label param
        await expect(page).toHaveURL(/label=work/)
      }
    })

    test('should show reminder notes', async ({ page }) => {
      // Navigate to reminders view
      await page.goto('/notes/reminders')

      // Should filter to notes with reminders
      await expect(page.getByText(/notes with a reminder/i)).toBeVisible()
    })
  })

  test.describe('Responsive Design', () => {
    test('should show sidebar on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 768 })

      await expect(page.getByRole('navigation')).toBeVisible()
    })

    test('should hide sidebar on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })

      // Sidebar should be hidden or in a drawer
      const sidebar = page.getByRole('navigation')
      if (await sidebar.isVisible()) {
        // Might be in a drawer that needs to be opened
        await expect(sidebar).not.toBeVisible()
      }
    })
  })
})
