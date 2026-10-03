import type { Page } from '@playwright/test'

/**
 * Wait until React has hydrated the main app (port 3000).
 *
 * The main app does not set a `data-hydrated` marker (that is a better-panel
 * convention), so we detect hydration by waiting for React to attach its
 * internal props to a DOM node — which only happens after React has rendered
 * and hydrated the server-rendered HTML.
 */
export async function waitForMainHydration(page: Page) {
  await page.waitForFunction(
    () => {
      const el = document.querySelector('button')
      return !!el && Object.keys(el).some((k) => k.startsWith('__reactProps$'))
    },
    { timeout: 10_000 },
  )
}
