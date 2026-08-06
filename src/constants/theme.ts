import { Platform } from 'react-native'
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper'
import type { MD3Theme } from 'react-native-paper'

/**
 * Color palette matching the web admin panel's Google Keep-like aesthetic.
 *
 * Light mode: clean white backgrounds, subtle gray borders.
 * Dark mode:  warm dark-brown tones matching the app design reference
 * (Screenshots/): #211C13 background, #2E291E cards.
 */
export const Colors = {
  light: {
    text: '#202124',
    background: '#FFFFFF',
    backgroundElement: '#F1F3F4',
    backgroundSelected: '#E8EAED',
    textSecondary: '#5F6368',
    accent: '#1A73E8',
    accentLight: '#E8F0FE',
    surface: '#FFFFFF',
    border: '#DADCE0',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
  },
  dark: {
    text: '#ECE6DA',
    background: '#211C13',
    backgroundElement: '#2A251A',
    backgroundSelected: '#383225',
    textSecondary: '#A79F8F',
    accent: '#8AB4F8',
    accentLight: '#322B1E',
    surface: '#2E291E',
    border: '#373022',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
  },
} as const

export type ThemeColor = keyof typeof Colors.light

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
})

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
} as const

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0
export const MaxContentWidth = 800

export function paperTheme(scheme: 'light' | 'dark'): MD3Theme {
  const base = scheme === 'dark' ? MD3DarkTheme : MD3LightTheme
  const c = Colors[scheme]
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: c.accent,
      background: c.background,
      surface: c.surface,
      surfaceVariant: c.backgroundElement,
      onSurface: c.text,
      onSurfaceVariant: c.textSecondary,
      outline: c.border,
    },
  }
}
