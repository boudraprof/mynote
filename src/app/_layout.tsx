import { useEffect } from 'react'
import { Stack, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Platform, StyleSheet, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { PaperProvider } from 'react-native-paper'

import { QueryProvider } from '@/providers/query-provider'
import { AuthProvider } from '@/providers/auth-provider'
import { ThemeProvider, useThemePreference } from '@/providers/theme-provider'
import { Colors, paperTheme } from '@/constants/theme'
import { getDb } from '@/db'
import * as Notifications from 'expo-notifications'
import { useSyncPendingNotes } from '@/hooks/use-sync'
import { configureNotifications } from '@/lib/notifications'
import { noteIdFromNotificationData } from '@/lib/reminders'

import '../global.css'

function DbInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    getDb().catch(console.warn)
    void configureNotifications()
  }, [])

  useSyncPendingNotes()

  return (
    <>
      <ReminderNotificationHandler />
      {children}
    </>
  )
}

/** Deep-link to a note when its reminder notification is tapped. */
function ReminderNotificationHandler() {
  const router = useRouter()

  useEffect(() => {
    if (Platform.OS === 'web') return

    const openNote = (response: Notifications.NotificationResponse) => {
      const noteId = noteIdFromNotificationData(
        response.notification.request.content.data,
      )
      if (noteId) {
        router.push(`/note/${noteId}`)
      }
    }

    // Cold start: the app was launched by tapping a notification.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) openNote(response)
    })

    // Warm start: tapped while the app was already running.
    const subscription =
      Notifications.addNotificationResponseReceivedListener(openNote)
    return () => subscription.remove()
  }, [router])

  return null
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <GestureHandlerRootView style={styles.root}>
        <ThemedRoot />
      </GestureHandlerRootView>
    </ThemeProvider>
  )
}

function ThemedRoot() {
  const { scheme } = useThemePreference()

  return (
    <View style={[styles.root, { backgroundColor: Colors[scheme].background }]}>
      <PaperProvider theme={paperTheme(scheme)}>
        <QueryProvider>
          <AuthProvider>
            <DbInitializer>
              <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen
                  name="(drawer)"
                  options={{ headerShown: false }}
                />
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
                  options={{ presentation: 'modal', headerShown: true }}
                />
                <Stack.Screen
                  name="note/[id]"
                  options={{ headerShown: true }}
                />
                <Stack.Screen
                  name="profile/index"
                  options={{ presentation: 'modal', headerShown: true }}
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
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})
