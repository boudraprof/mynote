import '@/global.css'
import { Platform } from 'react-native'
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper'
import type { MD3Theme } from 'react-native-paper'

export const Colors = {
  light: {
    text: '#1A1A2E',
    background: '#F8F9FC',
    backgroundElement: '#ECEEF4',
    backgroundSelected: '#DDE0EC',
    textSecondary: '#6B7280',
    accent: '#6C63FF',
    accentLight: '#EEF0FF',
    surface: '#FFFFFF',
    border: '#E5E7EF',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
  },
  dark: {
    text: '#F1F3F9',
    background: '#0D0F1A',
    backgroundElement: '#1C1F2E',
    backgroundSelected: '#252840',
    textSecondary: '#8B90A7',
    accent: '#7C74FF',
    accentLight: '#1E1B3A',
    surface: '#161927',
    border: '#2A2D42',
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
