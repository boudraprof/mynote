/**
 * Pure helpers for reminder notifications.
 *
 * Kept free of expo-notifications / react-native imports so the logic can be
 * unit-tested in isolation; the OS-facing glue lives in `notifications.ts`.
 */

export const REMINDER_TITLE = 'Note reminder'

/** Build the notification body from the note's title. */
export function reminderBody(title: string | null | undefined): string {
  const trimmed = (title ?? '').trim()
  return trimmed ? `\u201C${trimmed}\u201D` : 'Time to check your note'
}

/** Pull the note id out of a notification's `data` payload. */
export function noteIdFromNotificationData(
  data: Record<string, unknown> | undefined,
): string | null {
  const id = data?.noteId
  return typeof id === 'string' && id.length > 0 ? id : null
}

/** Whether the reminder time is still in the future (i.e. worth scheduling). */
export function isReminderInFuture(
  reminderAt: string,
  now: Date = new Date(),
): boolean {
  const time = new Date(reminderAt).getTime()
  return !Number.isNaN(time) && time > now.getTime()
}
