import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { useColorScheme } from '@/hooks/use-color-scheme'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ColorScheme = 'light' | 'dark'

const STORAGE_KEY = 'theme-preference'

interface ThemeContextValue {
  /** The user's chosen preference (defaults to following the system). */
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
  /** The resolved color scheme after applying the preference. */
  scheme: ColorScheme
}

const ThemeContext = createContext<ThemeContextValue>({
  preference: 'system',
  setPreference: () => {},
  scheme: 'light',
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme()
  const [preference, setPreferenceState] = useState<ThemePreference>('system')

  useEffect(() => {
    let mounted = true
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (mounted && (stored === 'light' || stored === 'dark' || stored === 'system')) {
          setPreferenceState(stored)
        }
      })
      .catch(() => {
        // Fall back to following the system if storage is unavailable.
      })
    return () => {
      mounted = false
    }
  }, [])

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next)
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      // Non-critical: preference just won't persist across launches.
    })
  }

  const scheme: ColorScheme =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference

  return (
    <ThemeContext.Provider value={{ preference, setPreference, scheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useThemePreference() {
  return useContext(ThemeContext)
}
