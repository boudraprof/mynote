import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const localNotes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().default('local'),
  statusId: text('status_id'),
  title: text('title'),
  content: text('content'),
  image: text('image'),
  labels: text('labels'),
  pinned: integer('pinned', { mode: 'boolean' }).default(false),
  position: integer('position').default(0),
  checklist: integer('checklist', { mode: 'boolean' }).default(false),
  checklistItems: text('checklist_items'),
  palette: text('palette'),
  statusName: text('status_name'),
  reminderAt: text('reminder_at'),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
  synced: integer('synced', { mode: 'boolean' }).default(false),
})

export const syncQueue = sqliteTable('sync_queue', {
  id: text('id').primaryKey(),
  noteId: text('note_id').notNull(),
  operation: text('operation').notNull(),
  data: text('data'),
  createdAt: text('created_at'),
})

export const noteHistory = sqliteTable('note_history', {
  id: text('id').primaryKey(),
  noteId: text('note_id').notNull(),
  title: text('title'),
  content: text('content'),
  checklistItems: text('checklist_items'),
  labels: text('labels'),
  snapshot: text('snapshot').notNull(),
  timestamp: text('timestamp').notNull(),
  changeType: text('change_type').notNull(),
})
