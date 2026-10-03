/**
 * Accessibility utilities and helpers
 * WCAG 2.1 compliance helpers
 */

import logger from '@/utils/logger'

interface AccessibilityIssue {
  element: string
  issue: string
  severity: 'error' | 'warning' | 'info'
  wcag: string
  fix?: string
}

/**
 * Run accessibility audit on the page (development only)
 */
export function runAccessibilityAudit(): Array<AccessibilityIssue> {
  if (typeof document === 'undefined') return []

  const issues: Array<AccessibilityIssue> = []

  // Check images without alt text
  document.querySelectorAll('img').forEach((img) => {
    if (!img.alt && !img.getAttribute('aria-hidden')) {
      issues.push({
        element: `<img src="${img.src.slice(0, 50)}...">`,
        issue: 'Image missing alt text',
        severity: 'error',
        wcag: '1.1.1 Non-text Content',
        fix: 'Add alt attribute describing the image content',
      })
    }
  })

  // Check buttons without accessible names
  document.querySelectorAll('button').forEach((button) => {
    const text = button.textContent.trim()
    const ariaLabel = button.getAttribute('aria-label')
    const ariaLabelledby = button.getAttribute('aria-labelledby')

    if (!text && !ariaLabel && !ariaLabelledby) {
      issues.push({
        element: `<button>...</button>`,
        issue: 'Button missing accessible name',
        severity: 'error',
        wcag: '4.1.2 Name, Role, Value',
        fix: 'Add aria-label or visible text content',
      })
    }
  })

  // Check form inputs without labels
  document.querySelectorAll('input, select, textarea').forEach((input) => {
    const id = input.id
    const ariaLabel = input.getAttribute('aria-label')
    const ariaLabelledby = input.getAttribute('aria-labelledby')
    const hasLabel = id ? document.querySelector(`label[for="${id}"]`) : false

    if (!hasLabel && !ariaLabel && !ariaLabelledby) {
      issues.push({
        element: `<${input.tagName.toLowerCase()} id="${id || 'undefined'}">`,
        issue: 'Form control missing label',
        severity: 'error',
        wcag: '1.3.1 Info and Relationships',
        fix: 'Add a <label> element or aria-label attribute',
      })
    }
  })

  // Check color contrast (simplified check)
  document.querySelectorAll('*').forEach((element) => {
    const style = window.getComputedStyle(element)
    const color = style.color
    const bgColor = style.backgroundColor

    // Skip transparent backgrounds
    if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') return

    // Simple contrast check - in production use a proper contrast ratio calculator
    if (color === bgColor) {
      issues.push({
        element: `<${element.tagName.toLowerCase()}>`,
        issue: 'Text color matches background color',
        severity: 'warning',
        wcag: '1.4.3 Contrast (Minimum)',
        fix: 'Ensure sufficient contrast between text and background',
      })
    }
  })

  // Check for keyboard focus indicators
  document.querySelectorAll('a, button, input, select, textarea, [tabindex]').forEach((element) => {
    const style = window.getComputedStyle(element)
    const outline = style.outline
    const boxShadow = style.boxShadow

    // Check if outline is removed without replacement
    if (outline === 'none' && (!boxShadow || boxShadow === 'none')) {
      issues.push({
        element: `<${element.tagName.toLowerCase()}>`,
        issue: 'No visible focus indicator',
        severity: 'warning',
        wcag: '2.4.7 Focus Visible',
        fix: 'Add visible focus styles (outline or box-shadow)',
      })
    }
  })

  // Check for proper heading hierarchy
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
  let lastLevel = 0
  headings.forEach((heading) => {
    const level = parseInt(heading.tagName.charAt(1))
    if (level > lastLevel + 1 && lastLevel !== 0) {
      issues.push({
        element: `<${heading.tagName.toLowerCase()}>${heading.textContent.slice(0, 20)}...</${heading.tagName.toLowerCase()}>`,
        issue: `Heading level skipped from h${lastLevel} to h${level}`,
        severity: 'warning',
        wcag: '1.3.1 Info and Relationships',
        fix: 'Use sequential heading levels',
      })
    }
    lastLevel = level
  })

  // Check for landmark regions
  const hasMain = document.querySelector('main, [role="main"]')
  const hasNav = document.querySelector('nav, [role="navigation"]')

  if (!hasMain) {
    issues.push({
      element: '<body>',
      issue: 'Missing main landmark',
      severity: 'info',
      wcag: '1.3.1 Info and Relationships',
      fix: 'Add <main> element or role="main"',
    })
  }

  if (!hasNav) {
    issues.push({
      element: '<body>',
      issue: 'Missing navigation landmark',
      severity: 'info',
      wcag: '1.3.1 Info and Relationships',
      fix: 'Add <nav> element or role="navigation"',
    })
  }

  // Log results
  if (issues.length > 0) {
    logger.warn(`Accessibility audit found ${issues.length} issues`, 'A11y')
    issues.forEach((issue) => {
      logger.debug(
        `[${issue.severity}] ${issue.issue} - ${issue.wcag}`,
        'A11y'
      )
    })
  }

  return issues
}

/**
 * Check if an element is visible to screen readers
 */
export function isScreenReaderVisible(element: HTMLElement): boolean {
  const ariaHidden = element.getAttribute('aria-hidden')
  if (ariaHidden === 'true') return false

  const style = window.getComputedStyle(element)
  if (style.display === 'none') return false
  if (style.visibility === 'hidden') return false

  return true
}

/**
 * Trap focus within a container (for modals)
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea:not([disabled]), ' +
    'input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )

  const firstElement = focusableElements[0]
  const lastElement = focusableElements[focusableElements.length - 1]

  // Nothing focusable inside the container — nothing to trap
  if (!firstElement || !lastElement) return () => {}

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Tab') return
    // Re-check inside the closure (function declarations are hoisted, so
    // the outer guard's narrowing does not reach here).
    if (!firstElement || !lastElement) return

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
  }

  container.addEventListener('keydown', handleKeyDown)
  firstElement.focus()

  return () => {
    container.removeEventListener('keydown', handleKeyDown)
  }
}

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcer = document.createElement('div')
  announcer.setAttribute('role', 'status')
  announcer.setAttribute('aria-live', priority)
  announcer.setAttribute('aria-atomic', 'true')
  announcer.className = 'sr-only'
  announcer.textContent = message

  document.body.appendChild(announcer)

  setTimeout(() => {
    document.body.removeChild(announcer)
  }, 1000)
}

/**
 * Generate skip link for keyboard navigation
 */
export function createSkipLink(targetId: string, text: string = 'Skip to main content'): HTMLElement {
  const link = document.createElement('a')
  link.href = `#${targetId}`
  link.textContent = text
  link.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:p-4 focus:bg-background focus:border focus:rounded'
  
  return link
}

/**
 * Keyboard shortcut manager
 */
export class KeyboardShortcutManager {
  private shortcuts: Map<string, () => void> = new Map()
  private enabled = true

  register(shortcut: string, callback: () => void): void {
    this.shortcuts.set(shortcut, callback)
  }

  unregister(shortcut: string): void {
    this.shortcuts.delete(shortcut)
  }

  enable(): void {
    this.enabled = true
  }

  disable(): void {
    this.enabled = false
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (!this.enabled) return

    const shortcut = this.getShortcutString(event)
    const callback = this.shortcuts.get(shortcut)

    if (callback) {
      event.preventDefault()
      callback()
    }
  }

  private getShortcutString(event: KeyboardEvent): string {
    const parts: Array<string> = []

    if (event.ctrlKey || event.metaKey) parts.push('mod')
    if (event.altKey) parts.push('alt')
    if (event.shiftKey) parts.push('shift')

    parts.push(event.key.toLowerCase())

    return parts.join('+')
  }

  getRegisteredShortcuts(): Array<string> {
    return Array.from(this.shortcuts.keys())
  }
}

// Singleton keyboard shortcut manager
export const keyboardShortcuts = new KeyboardShortcutManager()
