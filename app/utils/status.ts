import { NoteStatusType } from "@/types"

export const NOTE_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  TRASH: 'trash',
  REMINDER: 'reminder',
} as const


export const NOTE_STATUS_LABELS: Record<NoteStatusType, string> = {
  [NOTE_STATUS.ACTIVE]: 'Active',
  [NOTE_STATUS.ARCHIVED]: 'Archived',
  [NOTE_STATUS.TRASH]: 'Trash',
  [NOTE_STATUS.REMINDER]: 'Reminder',
} as const
