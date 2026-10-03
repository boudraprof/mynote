import { relations, sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'

export const noteStatus = pgTable('note_status', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const noteLabels = pgTable(
  'note_labels',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('note_labels_userId_idx').on(table.userId),
    // Uniqueness is per-user, not global
    uniqueIndex('note_labels_userId_name_unique').on(
      table.userId,
      table.name,
    ),
  ],
)

export const user = pgTable('user', {
  id:  text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  role: text('role').default('user').notNull(),
  banned: boolean('banned').default(false),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires'),
  lastSeenAt: timestamp('last_seen_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

export const notesTable = pgTable(
  'notes',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    statusId: text('status_id')
      .notNull()
      .references(() => noteStatus.id),

    title: varchar({ length: 255 }),
    image: text('image'),
    content: text(),

    pinned: boolean('pinned').default(false).notNull(),
    position: integer('position').default(0).notNull(),

    checklist: boolean('checklist').default(false).notNull(),
    checklistItems: text('checklist_items'),

    palette: varchar({ length: 100 }),

    reminderAt: timestamp('reminder_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),

    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('notes_userId_idx').on(table.userId),
    index('notes_statusId_idx').on(table.statusId),
  ],
)

export const notesLabels = pgTable(
  'notes_labels',
  {
    noteId: text('note_id')
      .notNull()
      .references(() => notesTable.id, { onDelete: 'cascade' }),

    labelId: text('label_id')
      .notNull()
      .references(() => noteLabels.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({
      columns: [table.noteId, table.labelId],
    }),
  ],
)

export const noteShares = pgTable(
  'note_shares',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    noteId: text('note_id')
      .notNull()
      .references(() => notesTable.id, { onDelete: 'cascade' }),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    sharedWithEmail: text('shared_with_email').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('note_shares_note_email_unique').on(
      table.noteId,
      table.sharedWithEmail,
    ),
    index('note_shares_shared_with_email_idx').on(table.sharedWithEmail),
  ],
)

export const session = pgTable(
  'session',
  {
    id:  text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    impersonatedBy: text('impersonated_by'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('session_userId_idx').on(table.userId)],
)

export const account = pgTable(
  'account',
  {
    id:  text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('account_userId_idx').on(table.userId)],
)

export const verification = pgTable(
  'verification',
  {
    id:  text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
)

export const rateLimit = pgTable('rate_limit', {
  id:  text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
  key: text('key').unique().notNull(),
  count: integer('count').notNull(),
  lastRequest: bigint('last_request', { mode: 'number' }).notNull(),
})

export const noteHistory = pgTable(
  'note_history',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    noteId: text('note_id')
      .notNull()
      .references(() => notesTable.id, { onDelete: 'cascade' }),
    title: text('title'),
    content: text('content'),
    checklistItems: text('checklist_items'),
    labels: jsonb('labels').$type<Array<string>>().default([]).notNull(),
    snapshot: jsonb('snapshot').$type<Record<string, unknown>>().notNull(),
    timestamp: text('timestamp').notNull(),
    changeType: text('change_type').notNull(),
  },
  (table) => [
    index('note_history_noteId_idx').on(table.noteId),
    index('note_history_timestamp_idx').on(table.timestamp),
  ],
)

/* Relations */

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  notes: many(notesTable),
}))

export const notesRelations = relations(notesTable, ({ one, many }) => ({
  user: one(user, {
    fields: [notesTable.userId],
    references: [user.id],
  }),

  status: one(noteStatus, {
    fields: [notesTable.statusId],
    references: [noteStatus.id],
  }),

  labels: many(notesLabels),
}))

export const noteStatusRelations = relations(noteStatus, ({ many }) => ({
  notes: many(notesTable),
}))

export const noteLabelsRelations = relations(noteLabels, ({ one, many }) => ({
  user: one(user, {
    fields: [noteLabels.userId],
    references: [user.id],
  }),
  notes: many(notesLabels),
}))

export const notesLabelsRelations = relations(notesLabels, ({ one }) => ({
  note: one(notesTable, {
    fields: [notesLabels.noteId],
    references: [notesTable.id],
  }),

  label: one(noteLabels, {
    fields: [notesLabels.labelId],
    references: [noteLabels.id],
  }),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}))


export const noteHistoryRelations = relations(noteHistory, ({ one }) => ({
  note: one(notesTable, {
    fields: [noteHistory.noteId],
    references: [notesTable.id],
  }),
}))
