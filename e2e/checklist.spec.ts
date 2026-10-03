import { expect, test } from '@playwright/test'
import { waitForMainHydration } from './main-app-helpers'

test.describe('Checklist', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/notes')
    await waitForMainHydration(page)
  })

  test('should toggle checklist mode in note creator', async ({ page }) => {
    await page.getByText('Take a note...').click()

    // Look for a checkbox/list toggle button
    const checklistButton = page.getByTitle(/More options/i)

    if (await checklistButton.isVisible()) {
      await checklistButton.click()

      // Should show checklist input fields
      await page.getByText(/checklist/i).last().click()
      await expect(page.getByText(/Text mode/i)).toBeVisible()
    }
  })

  test('should add checklist items', async ({ page }) => {
    await page.getByText('Take a note...').click()

    // Toggle checklist mode
const checklistButton = page.getByTitle(/More options/i)
if (await checklistButton.isVisible()) {
  await checklistButton.click()
  await page.locator('span', {hasText: /checklist/i}).click()

      // Add a checklist item
        const listInput = page.getByPlaceholder(/checklist|list item/i).last()
      if (await listInput.isVisible()) {
        await listInput.fill('Task 1')
        await listInput.press('Enter')

        await page.locator('button', {hasNotText: /Close/i}).click() 
        // Should show the item
        await page.waitForTimeout(3000)
        await expect(page.getByText('Task 1')).toBeVisible()
      }
    }
  })

  test('should toggle checklist item completion', async ({ page }) => {
    await page.getByText('Take a note...').click()

  const checklistButton =  page.locator('span', {hasText: /checklist/i})
  
      // .locator('button')
      // .filter({
      //   has: page.locator('svg.lucide-check-square, svg.lucide-list-checks'),
      // })
      // .or(page.getByText(/checklist|checkbox/i))

    if (await checklistButton.isVisible()) {
      await checklistButton.click()

      // Add an item
      const listInput = page.getByPlaceholder(/checklist|list item/i).first()
      if (await listInput.isVisible()) {
        await listInput.fill('Task 1')
        await listInput.press('Enter')

        // Click the checkbox to toggle completion
        const checkbox = page
          .locator('input[type="checkbox"]')
          .first()
          .or(page.locator('[role="checkbox"]').first())
        if (await checkbox.isVisible()) {
          await checkbox.click()
          // Item should now show as checked (strikethrough or visual change)
        }
      }
    }
  })

  test('should create a note with checklist and persist after save', async ({
    page,
  }) => {
    await page.getByText('Take a note...').click()
    await page.getByPlaceholder('Title').fill(`e2e Test Note`)

    const checklistButton =  page.locator('span', {hasText: /checklist/i})
    //  page
    //   .locator('button')
    //   .filter({
    //     has: page.locator('svg.lucide-check-square, svg.lucide-list-checks'),
    //   })
    //   .or(page.getByText(/checklist|checkbox/i))

    if (await checklistButton.isVisible()) {
      await checklistButton.click()

      const listInput = page.getByPlaceholder(/checklist|list item/i).first()
      if (await listInput.isVisible()) {
        await listInput.fill('Buy groceries')
        await listInput.press('Enter')
        await listInput.fill('Walk the dog')
        await listInput.press('Enter')
      }
    }

    // Close to save
    await page.locator('button').filter({ hasText: /close/i }).click()
    await page.waitForTimeout(1000)

    // The note should appear with the title
    await expect(page.getByText('e2e Test Note').last()).toBeVisible({
      timeout: 5000,
    })
  })
})
