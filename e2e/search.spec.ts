import { expect, test } from '@playwright/test'
import { waitForMainHydration } from './main-app-helpers'

test.describe('Search', () => {
  test.beforeEach(async ({ page }) => {
    // The session comes from the shared storageState (see main-app-global-setup)
    await page.goto('/notes')
    await waitForMainHydration(page)
  })

  test('should have a search input', async ({ page }) => {
    // Search should be visible in the header/sidebar
    const searchInput = page.getByPlaceholder(/search/i)
    await expect(searchInput).toBeVisible()
  })

  test('should show results when typing a search query', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i)
    
    // Create a note first to search for
    await page.getByText('Take a note...').click()
    await page.getByPlaceholder('Title').fill('Unique Searchable Note')
    await page.getByRole('button', { name: /close/i }).click()
    await page.waitForTimeout(1000)

    // Search for the note
    await searchInput.fill('Unique Searchable')
    await page.waitForTimeout(1500) // Debounce delay

    // Should show the note
    await expect(page.getByText('Unique Searchable Note')).toBeVisible({ timeout: 5000 })
  })

  test('should show "not found" message when no results', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i)
    
    await searchInput.fill('xyznonexistentquery123')
    await page.waitForTimeout(1500)

    // Should show not found message
    await expect(page.getByText(/not found/i)).toBeVisible()
  })

  test('should clear search results when clearing input', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i)
    
    // Search for something
    await searchInput.fill('test')
    await page.waitForTimeout(1500)

    // Clear the search
    await searchInput.clear()
    await page.waitForTimeout(500)

    // Should show normal notes view
    await expect(page.getByText('Take a note...')).toBeVisible()
  })

  test('should search in note content', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i)
    
    // Create a note with specific content
    await page.getByText('Take a note...').click()
    await page.getByPlaceholder('Title').fill('Content Search Test')
    await page.getByPlaceholder('Take a note...').fill('This has unique content XYZ')
    await page.getByRole('button', { name: /close/i }).click()
    await page.waitForTimeout(1000)

    // Search by content
    await searchInput.fill('unique content XYZ')
    await page.waitForTimeout(1500)

    // Should find the note
    await expect(page.getByText('Content Search Test')).toBeVisible({ timeout: 5000 })
  })
})
