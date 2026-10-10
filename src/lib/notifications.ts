import { Platform } from 'react-native'
import type { NotificationResponse } from 'expo-notifications'
import Constants, { ExecutionEnvironment } from 'expo-constants'
import {
  isReminderInFuture,
  noteIdFromNotificationData,
  reminderBody,
} from '@/lib/reminders'

const REMINDER_CHANNEL_ID = 'reminders'

/**
 * expo-notifications is unavailable on Android in Expo Go (removed in SDK 53);
 * importing the module there throws at load time and would crash the app. We
 * load it lazily and only when it can actually work, so the app still runs in
 * Expo Go — reminders simply don't fire there. Development builds
 * (expo run:android / EAS) and iOS keep full reminder support.
 */
const notificationsAvailable =
  Platform.OS !== 'android' ||
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient

async function loadNotifications() {
  return await import('expo-notifications')
}

/** Configure notifications once at app start. */
export async function configureNotifications(): Promise<void> {
  if (!notificationsAvailable) return
  const Notifications = await loadNotifications()
  // Show reminders as banners/list entries even while foregrounded.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  })
  // Create the Android notification channel.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: 'Note reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    })
  }
}

/** Make sure the OS allows notifications; prompts on first use. */
export async function ensureReminderPermissions(): Promise<boolean> {
  if (!notificationsAvailable) return false
  const Notifications = await loadNotifications()
  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true
  const requested = await Notifications.requestPermissionsAsync()
  return requested.granted
}

/**
 * Replace any scheduled notification for a note with one that fires at
 * `reminderAt`. Drops stale ones when the time has already passed.
 */
export async function scheduleReminder(
  noteId: string,
  title: string | null | undefined,
  reminderAt: string,
): Promise<void> {
  if (!notificationsAvailable) return
  await cancelReminder(noteId)
  if (!isReminderInFuture(reminderAt)) return
  const Notifications = await loadNotifications()
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Note reminder',
      body: reminderBody(title),
      sound: 'default',
      data: { noteId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(reminderAt),
      channelId: Platform.OS === 'android' ? REMINDER_CHANNEL_ID : undefined,
    },
  })
}

/**
 * Bring the OS notification in line with a note's stored reminder: prompt for
 * permission and schedule it when a reminder is set, or cancel any pending one
 * when it is cleared. Returns `false` only when a reminder was requested but
 * the user has notifications disabled, so callers can surface that.
 */
export async function syncReminderNotification(
  noteId: string,
  title: string | null | undefined,
  reminderAt: string | null,
): Promise<boolean> {
  if (!reminderAt) {
    await cancelReminder(noteId)
    return true
  }
  // Nothing to warn about where notifications can't run at all (e.g. Expo Go
  // on Android) — only report back when the user has actually denied them.
  if (!notificationsAvailable) return true
  const granted = await ensureReminderPermissions()
  if (!granted) return false
  await scheduleReminder(noteId, title, reminderAt)
  return true
}

/** Cancel any scheduled notification for the note (cleared/deleted notes). */
export async function cancelReminder(noteId: string): Promise<void> {
  if (!notificationsAvailable) return
  const Notifications = await loadNotifications()
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  const stale = scheduled.filter(
    (n) => noteIdFromNotificationData(n.content.data) === noteId,
  )
  await Promise.all(
    stale.map((n) =>
      Notifications.cancelScheduledNotificationAsync(n.identifier),
    ),
  )
}

/**
 * Call `onNoteId` when a reminder notification is tapped — both on cold start
 * (the app was launched by tapping the notification) and while the app is
 * already running. Returns an unsubscribe function.
 */
export function subscribeToReminderResponses(
  onNoteId: (noteId: string) => void,
): () => void {
  if (!notificationsAvailable) return () => {}

  let cancelled = false
  let subscription: { remove: () => void } | undefined

  void loadNotifications().then((Notifications) => {
    if (cancelled) return

    const openNote = (response: NotificationResponse) => {
      const noteId = noteIdFromNotificationData(
        response.notification.request.content.data,
      )
      if (noteId) onNoteId(noteId)
    }

    // Cold start: the app was launched by tapping a notification.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response && !cancelled) openNote(response)
    })

    // Warm start: tapped while the app was already running.
    subscription =
      Notifications.addNotificationResponseReceivedListener(openNote)
  })

  return () => {
    cancelled = true
    subscription?.remove()
  }
}
