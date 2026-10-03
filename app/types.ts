import type { NOTE_STATUS, THEME_COLORS } from './utils/bgs-colors'
import type { notesTable } from './db/schema'

export type NoteFormData = Partial<NotesInsert> & {
  labels?: Array<string>
  /**
   * The note's status by name rather than by id. The composer owns this field
   * and the API resolves it to a `statusId` server-side, so it stays optional:
   * a form built from a fetched note only knows the id, and an absent name
   * simply falls back to the server default.
   */
  statusName?: NoteStatusType 
}

export type Notes = {
  data: Array<NotesInsert>
  total: number
  limit: number
  offset: number
}


export type NotesInsert = typeof notesTable.$inferSelect



export type ThemeColor = keyof typeof THEME_COLORS
export type NoteStatusType = (typeof NOTE_STATUS)[keyof typeof NOTE_STATUS]