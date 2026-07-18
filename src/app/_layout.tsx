import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { StyleSheet, useColorScheme } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { PaperProvider } from 'react-native-paper'

import { QueryProvider } from '@/providers/query-provider'
import { AuthProvider } from '@/providers/auth-provider'
import { paperTheme } from '@/constants/theme'
import { getDb } from '@/db'
import { useSyncPendingNotes } from '@/hooks/use-sync'

import "../global.css"

function DbInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    getDb().catch(console.warn)
  }, [])

  useSyncPendingNotes()

  return <>{children}</>
}

export default function RootLayout() {
  const scheme = useColorScheme()

  return (
    <GestureHandlerRootView style={styles.root}>
      <PaperProvider theme={paperTheme(scheme === 'dark' ? 'dark' : 'light')}>
        <QueryProvider>
          <AuthProvider>
            <DbInitializer>
              <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
                <Stack.Screen name="search" />
                <Stack.Screen
                  name="auth/login"
                  options={{ presentation: 'modal' }}
                />
                <Stack.Screen
                  name="auth/signup"
                  options={{ presentation: 'modal' }}
                />
                <Stack.Screen
                  name="note/create"
                  options={{ presentation: 'modal' }}
                />
                <Stack.Screen name="note/[id]" />
                <Stack.Screen
                  name="profile/index"
                  options={{ presentation: 'modal' }}
                />
                <Stack.Screen
                  name="labels/index"
                  options={{ presentation: 'modal' }}
                />
              </Stack>
            </DbInitializer>
          </AuthProvider>
        </QueryProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})
