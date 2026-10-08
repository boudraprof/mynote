import { Platform } from 'react-native'
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper'
import type { MD3Theme } from 'react-native-paper'

/**
 * Color palette shared with the web app (app/globals.css).
 *
 * The web app uses a shadcn-style "neutral" theme defined in oklch; values
 * below are the same colors converted to hex for React Native.
 *
 * Light mode: near-white backgrounds, gray borders, near-black primary.
 * Dark mode:  #0A0A0A background, #171717 cards, near-white primary.
 */
export const Colors = {
  light: {
    text: '#171717',
    background: '#FFFFFF',
    backgroundElement: '#F5F5F5',
    backgroundSelected: '#E5E5E5',
    textSecondary: '#737373',
    accent: '#171717',
    accentLight: '#F5F5F5',
    onAccent: '#FAFAFA',
    surface: '#FFFFFF',
    border: '#E5E5E5',
    success: '#10B981',
    danger: '#E7000B',
    warning: '#F59E0B',
  },
  dark: {
    text: '#FAFAFA',
    background: '#0A0A0A',
    backgroundElement: '#262626',
    backgroundSelected: '#3A3A3A',
    textSecondary: '#A1A1A1',
    accent: '#E5E5E5',
    accentLight: '#262626',
    onAccent: '#171717',
    surface: '#171717',
    border: 'rgba(255,255,255,0.10)',
    success: '#10B981',
    danger: '#FF6467',
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
