import { expect, test } from '@playwright/test'

// These tests exercise the unauthenticated auth flows, so opt out of the
// shared storageState used by the rest of the main-app suite.
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Authentication', () => {
  test.describe('Sign Up', () => {
    test('should display sign up form', async ({ page }) => {
      await page.goto('/auth/signup')
      await expect(
        page.getByRole('button', { name: /Create your account/i }),
      ).toBeVisible()

      await expect(page.getByLabel('Name')).toBeVisible()
      await expect(page.getByLabel('Email')).toBeVisible()
      await expect(
        page
          .getByLabel("Password")
          .first(),
      ).toBeVisible()
      await expect(
        page.getByLabel('Confirm Password')
          .last()
      ).toBeVisible()
    })

    test('should show validation errors for empty fields', async ({ page }) => {
      await page.goto('/auth/signup')
      await page.getByRole('button', { name: 'Create your account' }).click()
      await expect(page.getByText('Invalid email')).toBeVisible()
    })

    test('should show validation error for invalid email', async ({ page }) => {
      await page.goto('/auth/signup')
      await page.getByPlaceholder('email@email.com').fill('invalid-email')

      await expect(page.getByText('invalid email')).toBeVisible()
    })

    test('should show validation error for short password', async ({
      page,
    }) => {
      await page.goto('/auth/signup')

      await page.getByLabel('Password').first().fill('123')

         await expect(
        page
          .getByText(/Password must be at least 8 characters/i)
          .first(),
      ).toBeVisible()
    })
  })

  test.describe('Sign In', () => {
    test('should display sign in form', async ({ page }) => {
      await page.goto('/auth/signin')

      await expect(page.getByLabel('Email')).toBeVisible()
      await expect(page.getByPlaceholder('Password')).toBeVisible()
      await expect(page.getByRole('button', { name: /login/i })).toBeVisible()
    })

    test('should navigate to sign up from sign in', async ({ page }) => {
      await page.goto('/auth/signin')

      await page.getByText("Don't have an account? Sign Up").click()

      await expect(page).toHaveURL(/.*\/auth\/signup/)
    })

    test('should navigate to forgot password', async ({ page }) => {
      await page.goto('/auth/signin')
        
        await page
          .getByText("Forgot password?").click()

      await expect(page).toHaveURL(/.*\/auth\/forgot-password/)
    })
  })

  test.describe('Forgot Password', () => {
    test('should display forgot password form', async ({ page }) => {
      await page.goto('/auth/forgot-password')

      await expect(page.getByLabel('Email')).toBeVisible()
      await expect(
        page.getByRole('button', { name: /send reset link/i }),
      ).toBeVisible()
    })

    test('should show success message after submitting', async ({ page }) => {
      await page.goto('/auth/forgot-password')

      await page.getByLabel('Email').fill('test@example.com')
      await page.getByRole('button', { name:"Send reset link" }).click()

      await expect(page.getByText(/if an account exists/i)).toBeVisible()
    })

    test('should show validation error for invaild token', async ({ page }) => {
      await page.goto('/auth/reset-password')

      await expect(page.getByText(/invalid or expired/i)).toBeVisible()
    })
  })
})
