import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import {
  isReminderInFuture,
  noteIdFromNotificationData,
  reminderBody,
} from '@/lib/reminders'

const REMINDER_CHANNEL_ID = 'reminders'

// Show reminders as banners/list entries even while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

/** Create the Android notification channel (call once at app start). */
export async function configureNotifications(): Promise<void> {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Note reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  })
}

/** Make sure the OS allows notifications; prompts on first use. */
export async function ensureReminderPermissions(): Promise<boolean> {
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
  await cancelReminder(noteId)
  if (!isReminderInFuture(reminderAt)) return
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

/** Cancel any scheduled notification for the note (cleared/deleted notes). */
export async function cancelReminder(noteId: string): Promise<void> {
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
