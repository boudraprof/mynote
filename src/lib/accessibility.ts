/**
 * Accessibility utilities for React Native
 * WCAG 2.1 compliance helpers for mobile
 */

import { AccessibilityInfo, Platform } from 'react-native'

/**
 * Check if screen reader is enabled
 */
export async function isScreenReaderEnabled(): Promise<boolean> {
  try {
    return await AccessibilityInfo.isScreenReaderEnabled()
  } catch {
    return false
  }
}

/**
 * Check if reduce motion is enabled
 */
export async function isReduceMotionEnabled(): Promise<boolean> {
  try {
    return await AccessibilityInfo.isReduceMotionEnabled()
  } catch {
    return false
  }
}

/**
 * Announce message to screen readers
 */
export function announceForAccessibility(message: string): void {
  AccessibilityInfo.announceForAccessibility(message)
}

/**
 * Set accessibility focus on element
 */
export function setAccessibilityFocus(reactTag: number): void {
  AccessibilityInfo.setAccessibilityFocus(reactTag)
}

/**
 * Get recommended animation duration based on accessibility settings
 */
export async function getAnimationDuration(defaultDuration: number = 300): Promise<number> {
  const reduceMotion = await isReduceMotionEnabled()
  return reduceMotion ? 0 : defaultDuration
}

/**
 * Common accessibility props for React Native components
 */
export const a11yProps = {
  /**
   * Button accessibility props
   */
  button: (label: string, hint?: string) => ({
    accessible: true,
    accessibilityRole: 'button' as const,
    accessibilityLabel: label,
    ...(hint && { accessibilityHint: hint }),
  }),

  /**
   * Header accessibility props
   */
  header: (level: number = 1) => ({
    accessible: true,
    accessibilityRole: 'header' as const,
    accessibilityLevel: level,
  }),

  /**
   * Image accessibility props
   */
  image: (label: string, isDecorative: boolean = false) => ({
    accessible: !isDecorative,
    accessibilityRole: 'image' as const,
    accessibilityLabel: isDecorative ? undefined : label,
    importantForAccessibility: isDecorative ? ('no' as const) : ('yes' as const),
  }),

  /**
   * Link accessibility props
   */
  link: (label: string, hint?: string) => ({
    accessible: true,
    accessibilityRole: 'link' as const,
    accessibilityLabel: label,
    ...(hint && { accessibilityHint: hint }),
  }),

  /**
   * Text accessibility props
   */
  text: (label?: string) => ({
    accessible: true,
    ...(label && { accessibilityLabel: label }),
  }),

  /**
   * Search input accessibility props
   */
  searchInput: (label: string, value?: string) => ({
    accessible: true,
    accessibilityRole: 'search' as const,
    accessibilityLabel: label,
    accessibilityState: {
      ...(value !== undefined && { value }),
    },
  }),

  /**
   * Checkbox/Toggle accessibility props
   */
  toggle: (label: string, checked: boolean, hint?: string) => ({
    accessible: true,
    accessibilityRole: 'togglebutton' as const,
    accessibilityLabel: label,
    accessibilityState: { checked },
    accessibilityActions: [
      { name: 'activate', label: `Toggle ${label}` },
    ],
    ...(hint && { accessibilityHint: hint }),
  }),

  /**
   * List accessibility props
   */
  list: (itemCount: number, label?: string) => ({
    accessible: true,
    accessibilityRole: 'list' as const,
    accessibilityLabel: label || `List with ${itemCount} items`,
  }),

  /**
   * List item accessibility props
   */
  listItem: (label: string, index: number, total: number, hint?: string) => ({
    accessible: true,
    accessibilityRole: 'none' as const,
    accessibilityLabel: `${label}, ${index + 1} of ${total}`,
    ...(hint && { accessibilityHint: hint }),
  }),
}

/**
 * Accessibility checker for development
 */
export function checkAccessibility(componentName: string, props: Record<string, unknown>): string[] {
  const issues: string[] = []

  if (__DEV__) {
    // Check for missing accessibility labels on interactive elements
    if (
      props.onPress &&
      !props.accessibilityLabel &&
      !props.accessibilityRole
    ) {
      issues.push(`${componentName}: Interactive element missing accessibilityLabel`)
    }

    // Check for images without alt text
    if (props.source && !props.accessibilityLabel && props.importantForAccessibility !== 'no') {
      issues.push(`${componentName}: Image missing accessibilityLabel`)
    }

    // Log issues
    if (issues.length > 0) {
      console.warn(`[A11y] ${componentName}:`, issues)
    }
  }

  return issues
}

/**
 * Platform-specific accessibility adjustments
 */
export const platformA11y = {
  /**
   * Get minimum touch target size
   */
  getMinTouchTarget: (): number => {
    // iOS: 44x44pt, Android: 48x48dp
    return Platform.OS === 'ios' ? 44 : 48
  },

  /**
   * Get recommended font scale
   */
  getFontScale: async (): Promise<number> => {
    try {
      // getFontScale may not be available in all React Native versions
      const scale = await (AccessibilityInfo as any).getFontScale?.() ?? 1
      return scale
    } catch {
      return 1
    }
  },

  /**
   * Check if bold text is enabled (iOS)
   */
  isBoldTextEnabled: async (): Promise<boolean> => {
    if (Platform.OS !== 'ios') return false
    try {
      return await AccessibilityInfo.isBoldTextEnabled()
    } catch {
      return false
    }
  },

  /**
   * Check if grayscale is enabled (iOS)
   */
  isGrayscaleEnabled: async (): Promise<boolean> => {
    if (Platform.OS !== 'ios') return false
    try {
      return await AccessibilityInfo.isGrayscaleEnabled()
    } catch {
      return false
    }
  },

  /**
   * Check if invert colors is enabled
   */
  isInvertColorsEnabled: async (): Promise<boolean> => {
    try {
      return await AccessibilityInfo.isInvertColorsEnabled()
    } catch {
      return false
    }
  },
}
