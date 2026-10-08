import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { localNotes, syncQueue } from '@/db/schema'
import type { ApiNote } from '@/api/types'
import type { NoteInput, NoteUpdate } from '@/api/notes'

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function now() {
  return new Date().toISOString()
}

export async function getLocalNotes(params?: {
  field?: string
  label?: string
}) {
  const db = await getDb()

  const statusFilter =
    params?.field === 'reminder'
      ? 'reminder'
      : params?.field === 'archived'
        ? 'archived'
        : params?.field === 'trash'
          ? 'trash'
          : 'active'

  const rows = await db
    .select()
    .from(localNotes)
    .where(eq(localNotes.statusName, statusFilter))

  return rows.map(rowToNote)
}

export async function getLocalNoteById(id: string) {
  const db = await getDb()
  const [row] = await db.select().from(localNotes).where(eq(localNotes.id, id))
  return row ? rowToNote(row) : null
}

export async function createLocalNote(input: NoteInput) {
  const db = await getDb()
  const id = generateId()
  const timestamp = now()

  await db.insert(localNotes).values({
    id,
    userId: 'local',
    statusId: 'active',
    title: input.title ?? null,
    content: input.content ?? null,
    image: input.image ?? null,
    labels: input.labels ? JSON.stringify(input.labels) : null,
    pinned: input.pinned ?? false,
    position: input.position ?? 0,
    checklist: input.checklist ?? false,
    checklistItems: input.checklistItems ?? null,
    palette: input.palette ?? null,
    statusName: input.reminderAt ? 'reminder' : 'active',
    reminderAt: input.reminderAt ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
    synced: false,
  })

  await db.insert(syncQueue).values({
    id: generateId(),
    noteId: id,
    operation: 'create',
    data: JSON.stringify(input),
    createdAt: timestamp,
  })

  return id
}

export async function updateLocalNote(input: NoteUpdate) {
  const db = await getDb()
  const timestamp = now()

  await db
    .update(localNotes)
    .set({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.content !== undefined && { content: input.content }),
      ...(input.image !== undefined && { image: input.image }),
      ...(input.labels !== undefined && {
        labels: JSON.stringify(input.labels),
      }),
      // Mirror the server: a trashed note can never stay pinned.
      ...(input.statusName === 'trash'
        ? { pinned: false }
        : input.pinned !== undefined && { pinned: input.pinned }),
      ...(input.position !== undefined && { position: input.position }),
      ...(input.checklist !== undefined && { checklist: input.checklist }),
      ...(input.checklistItems !== undefined && {
        checklistItems: input.checklistItems,
      }),
      ...(input.palette !== undefined && { palette: input.palette }),
      ...(input.statusName !== undefined && {
        statusName: input.statusName,
      }),
      ...(input.reminderAt !== undefined && {
        reminderAt: input.reminderAt,
        // Mirror the server: setting a reminder moves the note to the
        // reminder status, clearing it moves it back to active — unless the
        // caller already chose a status (e.g. an explicit archive).
        ...(input.statusName === undefined && {
          statusName: input.reminderAt ? 'reminder' : 'active',
        }),
      }),
      updatedAt: timestamp,
      synced: false,
    })
    .where(eq(localNotes.id, input.id))

  const existingQueue = await db
    .select()
    .from(syncQueue)
    .where(eq(syncQueue.noteId, input.id))

  if (existingQueue.length > 0) {
    await db
      .update(syncQueue)
      .set({
        data: JSON.stringify(input),
        createdAt: timestamp,
      })
      .where(eq(syncQueue.noteId, input.id))
  } else {
    await db.insert(syncQueue).values({
      id: generateId(),
      noteId: input.id,
      operation: 'update',
      data: JSON.stringify(input),
      createdAt: timestamp,
    })
  }
}

export async function deleteLocalNote(id: string) {
  const db = await getDb()

  await db
    .update(localNotes)
    .set({
      statusName: 'trash',
      pinned: false,
      synced: false,
      updatedAt: now(),
    })
    .where(eq(localNotes.id, id))

  const existingQueue = await db
    .select()
    .from(syncQueue)
    .where(eq(syncQueue.noteId, id))

  if (existingQueue.length > 0) {
    await db
      .update(syncQueue)
      .set({ operation: 'delete', createdAt: now() })
      .where(eq(syncQueue.noteId, id))
  } else {
    await db.insert(syncQueue).values({
      id: generateId(),
      noteId: id,
      operation: 'delete',
      createdAt: now(),
    })
  }
}

export async function mergeServerNotes(serverNotes: ApiNote[]) {
  const db = await getDb()

  for (const note of serverNotes) {
    const [existing] = await db
      .select()
      .from(localNotes)
      .where(eq(localNotes.id, note.id))

    if (existing) {
      if (existing.synced) {
        await db
          .update(localNotes)
          .set({
            title: note.title,
            content: note.content,
            image: note.image,
            labels: JSON.stringify(note.labels),
            pinned: note.pinned ?? false,
            position: note.position ?? 0,
            checklist: note.checklist ?? false,
            checklistItems: note.checklistItems,
            palette: note.palette,
            statusName: note.StatusName ?? (note.reminderAt ? 'reminder' : 'active'),
            userId: note.userId,
            reminderAt: note.reminderAt ?? null,
            updatedAt: note.updatedAt,
            synced: true,
          })
          .where(eq(localNotes.id, note.id))
      }
    } else {
      await db.insert(localNotes).values({
        id: note.id,
        userId: note.userId,
        statusId: note.statusId,
        title: note.title,
        content: note.content,
        image: note.image,
        labels: JSON.stringify(note.labels),
        pinned: note.pinned ?? false,
        position: note.position ?? 0,
        checklist: note.checklist ?? false,
        checklistItems: note.checklistItems,
        palette: note.palette,
        statusName: note.StatusName ?? (note.reminderAt ? 'reminder' : 'active'),
        createdAt: note.createdAt,
        reminderAt: note.reminderAt ?? null,
        updatedAt: note.updatedAt,
        synced: true,
      })
    }
  }
}

export async function getPendingSyncOperations() {
  const db = await getDb()
  return await db.select().from(syncQueue).orderBy(syncQueue.createdAt)
}

export async function removeSyncOperation(id: string) {
  const db = await getDb()
  await db.delete(syncQueue).where(eq(syncQueue.id, id))
}

/**
 * Re-point a locally-created note (and its pending ops) at the id the server
 * assigned when the create op was synced. The server ignores client-generated
 * ids and mints its own, so without this later update/delete ops would target
 * a note id the server has never seen (404 forever).
 */
export async function rekeyLocalNote(oldId: string, newId: string) {
  const db = await getDb()
  await db
    .update(syncQueue)
    .set({ noteId: newId })
    .where(eq(syncQueue.noteId, oldId))
  await db
    .update(localNotes)
    .set({ id: newId })
    .where(eq(localNotes.id, oldId))
}

export async function markNoteSynced(noteId: string) {
  const db = await getDb()
  await db
    .update(localNotes)
    .set({ synced: true })
    .where(eq(localNotes.id, noteId))
}

function rowToNote(row: typeof localNotes.$inferSelect): ApiNote {
  return {
    id: row.id,
    userId: row.userId,
    statusId: '',
    title: row.title,
    content: row.content,
    image: row.image,
    labels: row.labels ? JSON.parse(row.labels) : [],
    pinned: row.pinned ?? false,
    position: row.position ?? 0,
    checklist: row.checklist ?? false,
    checklistItems: row.checklistItems,
    palette: row.palette,
    reminderAt: row.reminderAt ?? null,
    StatusName: row.statusName ?? 'active',
    createdAt: row.createdAt ?? now(),
    updatedAt: row.updatedAt ?? now(),
  }
}
