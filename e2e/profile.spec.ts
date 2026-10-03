import { expect, test } from '@playwright/test'
import { waitForMainHydration } from './main-app-helpers'

test.describe('User Profile', () => {
  test.beforeEach(async ({ page }) => {
    // The session comes from the shared storageState (see main-app-global-setup)
    await page.goto('/notes')
    await waitForMainHydration(page)
  })

  test('should display profile page', async ({ page }) => {
    await page.goto('/user/profile')

    await expect(page.getByText(/name/i).first()).toBeVisible()
    await expect(page.getByText(/email/i).first()).toBeVisible()
  })

  test('should show user avatar or icon', async ({ page }) => {
    await page.goto('/user/profile')

    // Should show either an image or a User icon
    const avatar = page.locator('img[alt="Profile preview"]')
    const icon = page.locator('svg.lucide-user')

    const avatarVisible = await avatar.isVisible().catch(() => false)
    const iconVisible = await icon.isVisible().catch(() => false)

    expect(avatarVisible || iconVisible).toBe(true)
  })

  test('should have name input field', async ({ page }) => {
    await page.goto('/user/profile')

    const nameInput = page.getByLabel('Name')
    await expect(nameInput).toBeVisible()
  })

  test('should have email input field', async ({ page }) => {
    await page.goto('/user/profile')

    const emailInput = page.getByLabel('Email')
    await expect(emailInput).toBeVisible()
  })

  test('should have password change fields', async ({ page }) => {
    await page.goto('/user/profile')

    await expect(page.getByLabel('Current Password')).toBeVisible()
    await expect(page.getByLabel('New Password')).toBeVisible()
    await expect(page.getByLabel('Conform Password')).toBeVisible()
  })

  test('should have submit and reset buttons', async ({ page }) => {
    await page.goto('/user/profile')

    await expect(page.getByRole('button', { name: /submit/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /reset/i })).toBeVisible()
  })

  test('should have delete account option', async ({ page }) => {
    await page.goto('/user/profile')

    await expect(page.getByText(/delete account/i)).toBeVisible()
  })

  test('should show validation error for invalid email', async ({ page }) => {
    await page.goto('/user/profile')

    const emailInput = page.getByLabel('Email')
    await emailInput.clear()
    await emailInput.fill('invalid-email')
    await emailInput.blur()

    await expect(page.getByText(/invalid email/i)).toBeVisible()
  })

  test('should reset form on reset button click', async ({ page }) => {
    await page.goto('/user/profile')

    const nameInput = page.getByLabel('Name')
    const originalValue = await nameInput.inputValue()

    // Change the name
    await nameInput.clear()
    await nameInput.fill('Test User Changed')

    // Click reset
    await page.getByRole('button', { name: /reset/i }).click()

    // Should revert to original value
    await expect(nameInput).toHaveValue(originalValue)
  })
})
