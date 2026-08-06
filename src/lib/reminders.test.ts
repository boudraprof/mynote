import { describe, expect, it } from 'vitest'
import {
  isReminderInFuture,
  noteIdFromNotificationData,
  reminderBody,
} from './reminders'

describe('reminderBody', () => {
  it('quotes a non-empty title', () => {
    expect(reminderBody('Buy milk')).toBe('\u201CBuy milk\u201D')
  })

  it('falls back to a generic message for empty titles', () => {
    expect(reminderBody('   ')).toBe('Time to check your note')
    expect(reminderBody(null)).toBe('Time to check your note')
    expect(reminderBody(undefined)).toBe('Time to check your note')
  })
})

describe('noteIdFromNotificationData', () => {
  it('returns the note id when present', () => {
    expect(noteIdFromNotificationData({ noteId: 'abc-123' })).toBe('abc-123')
  })

  it('returns null for missing or malformed data', () => {
    expect(noteIdFromNotificationData(undefined)).toBeNull()
    expect(noteIdFromNotificationData({})).toBeNull()
    expect(noteIdFromNotificationData({ noteId: 42 })).toBeNull()
    expect(noteIdFromNotificationData({ noteId: '' })).toBeNull()
  })
})

describe('isReminderInFuture', () => {
  const now = new Date('2026-08-06T12:00:00Z')

  it('true when the reminder is later than now', () => {
    expect(isReminderInFuture('2026-08-06T13:00:00Z', now)).toBe(true)
  })

  it('false when the reminder is now or in the past', () => {
    expect(isReminderInFuture('2026-08-06T12:00:00Z', now)).toBe(false)
    expect(isReminderInFuture('2026-08-06T11:00:00Z', now)).toBe(false)
  })

  it('false for invalid dates', () => {
    expect(isReminderInFuture('not-a-date', now)).toBe(false)
  })
})
