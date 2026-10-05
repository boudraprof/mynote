import { NextRequest } from "next/server";
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  or,
} from "drizzle-orm";
import { z } from "zod";

import { db } from "@/utils/config";
import {
  noteLabels,
  noteShares,
  noteStatus,
  notesLabels,
  notesTable,
} from "@/db/schema";
import logger from "@/utils/logger";
import { corsJson } from "@/utils/cors";
import { requireApiAuth } from "@/utils/api";
import { deleteImage } from "@/utils/image-storage";
import { getUserEmail } from "@/utils/share";
import { NOTE_STATUS } from "@/utils/status";
import { getStatusIdByName } from "@/utils/status.server";
import { sanitizeNoteHtml } from "@/utils/sanitize";
import { purgeExpiredTrash } from "@/utils/trash.server";
import { validateBody, validateSearchParams } from "@/utils/validation";
import { apiNoteSchema, syncNoteLabels } from "@/utils/server-only";
import { isEmptyNoteInput } from "@/utils/note-input";

async function fetchNoteLabels(
  noteIds: Array<string>,
): Promise<Map<string, Array<string>>> {
  if (noteIds.length === 0) return new Map();
  const rows = await db
    .select({
      noteId: notesLabels.noteId,
      name: noteLabels.name,
    })
    .from(notesLabels)
    .innerJoin(noteLabels, eq(notesLabels.labelId, noteLabels.id))
    .where(inArray(notesLabels.noteId, noteIds));

  const map = new Map<string, Array<string>>();
  for (const row of rows) {
    const labels = map.get(row.noteId) ?? [];
    labels.push(row.name);
    map.set(row.noteId, labels);
  }
  return map;
}




const updateSchema = apiNoteSchema.extend({ id: z.string() });
const notesQuerySchema = z.object({
  id: z.string().min(1).optional(),
  label: z.string().optional(),
  field: z.enum(NOTE_STATUS).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});
const deleteNoteQuerySchema = z.object({ id: z.string().min(1).optional() });
const createNoteRequestSchema = apiNoteSchema;

export async function GET(request: NextRequest) {
  try {
    const { session, response } = await requireApiAuth(request);
    if (response) return response;
    const userId = session.session.userId;
    const validated = validateSearchParams(request, notesQuerySchema);
    if ("response" in validated) return validated.response;
    const {
      id: noteId,
      label: labelFilter,
      field,
      limit,
      offset,
    } = validated.data;

    // Trash has a retention window: sweep anything that outlived it before
    // reading, so lists and totals below never include expired notes.
    await purgeExpiredTrash();

    // Support single note fetch by ID
    if (noteId) {
      const [note] = await db
        .select()
        .from(notesTable)
        .where(and(eq(notesTable.id, noteId), eq(notesTable.userId, userId)))
        .limit(1);

      if (!note) {
        return corsJson(
          request,
          { error: true, message: "Note not found" },
          { status: 404 },
        );
      }

      const labelsByNoteId = await fetchNoteLabels([note.id]);
      const data = { ...note, labels: labelsByNoteId.get(note.id) ?? [] };

      return corsJson(request, { data }, { status: 200 });
    }

    const currentUserEmail = await getUserEmail(userId);
    const sharedNoteIds = db
      .select({ noteId: noteShares.noteId })
      .from(noteShares)
      .where(eq(noteShares.sharedWithEmail, currentUserEmail ?? ""));

    const conditions = [
      or(eq(notesTable.userId, userId), inArray(notesTable.id, sharedNoteIds)),
    ];

    if (labelFilter) {
      // Label filter: fetch notes across ALL statuses
      const filteredIds = await db
        .select({ noteId: notesLabels.noteId })
        .from(notesLabels)
        .innerJoin(noteLabels, eq(notesLabels.labelId, noteLabels.id))
        .where(eq(noteLabels.name, labelFilter));

      if (filteredIds.length > 0) {
        conditions.push(
          inArray(
            notesTable.id,
            filteredIds.map((r) => r.noteId),
          ),
        );
      } else {
        conditions.push(eq(notesTable.id, ""));
      }
    } else if (field === NOTE_STATUS.REMINDER) {
      // Reminder view: show notes that have a reminderAt set
      conditions.push(isNotNull(notesTable.reminderAt));
    } else {
      // Normal mode: filter by status
      const statusName =
        field && Object.values(NOTE_STATUS).includes(field)
          ? field
          : NOTE_STATUS.ACTIVE;

      const statusId = await getStatusIdByName(statusName);
      conditions.push(eq(notesTable.statusId, statusId));
    }

    const order =
      field === NOTE_STATUS.REMINDER
        ? [asc(notesTable.reminderAt), desc(notesTable.createdAt)]
        : [
            desc(notesTable.pinned),
            asc(notesTable.position),
            desc(notesTable.createdAt),
          ];

    const res = await db
      .select({
        id: notesTable.id,
        userId: notesTable.userId,
        statusId: notesTable.statusId,
        title: notesTable.title,
        image: notesTable.image,
        content: notesTable.content,
        pinned: notesTable.pinned,
        position: notesTable.position,
        checklist: notesTable.checklist,
        checklistItems: notesTable.checklistItems,
        palette: notesTable.palette,
        reminderAt: notesTable.reminderAt,
        createdAt: notesTable.createdAt,
        updatedAt: notesTable.updatedAt,
        StatusName: noteStatus.name,
      })
      .from(notesTable)
      .leftJoin(noteStatus, eq(notesTable.statusId, noteStatus.id))
      .where(and(...conditions))
      .orderBy(...order)
      .limit(limit)
      .offset(offset);

    const noteIds = res.map((n) => n.id);
    const labelsByNoteId = await fetchNoteLabels(noteIds);

    const sharedIds = new Set<string>();
    const myShares = await db
      .select({ noteId: noteShares.noteId })
      .from(noteShares)
      .where(eq(noteShares.sharedWithEmail, currentUserEmail ?? ""));
    for (const s of myShares) sharedIds.add(s.noteId);

    const data = res.map((note) => ({
      ...note,
      labels: labelsByNoteId.get(note.id) ?? [],
      shared: sharedIds.has(note.id),
    }));

    const total = await db
      .select({ count: count() })
      .from(notesTable)
      .where(and(...conditions));

    return corsJson(
      request,
      { data, total: total[0]?.count || 0, limit, offset },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Failed to fetch notes", error, "API:notes");
    return corsJson(
      request,
      { error: true, message: "Failed to fetch notes" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, response } = await requireApiAuth(request);
    if (response) return response;
    const userId = session.session.userId;
    const validated = await validateBody(request, createNoteRequestSchema);
    if ("response" in validated) return validated.response;

    if (isEmptyNoteInput(validated.data)) {
      return corsJson(request, { error: false, message: 'Empty Inputs' }, { status: 200 });
    }
    const { statusName, ...noteFields } = validated.data;
    const noteInput = noteFields.content
      ? { ...noteFields, content: sanitizeNoteHtml(noteFields.content) }
      : noteFields;
    try {
      const statusId =
        noteInput.statusId ||
        (await getStatusIdByName(statusName || NOTE_STATUS.ACTIVE));

      const [inserted] = await db
        .insert(notesTable)
        .values({
          ...noteInput,
          userId,
          statusId,
        })
        .returning();

      if (!inserted) {
        return corsJson(
          request,
          { error: true, message: "Adding note failed" },
          { status: 500 },
        );
      }

      if (noteFields.labels && noteFields.labels.length > 0) {
        await syncNoteLabels(inserted.id, userId, noteFields.labels);
      }

      return corsJson(
        request,
        { error: false, message: "Note added", id: inserted.id },
        { status: 201 },
      );
    } catch (error) {
      logger.error("Failed to add note", error, "API:notes");
      return corsJson(
        request,
        { error: true, message: "Adding note failed" },
        { status: 500 },
      );
    }
  } catch (error) {
    logger.error("Failed to add note", error, "API:notes");
    return corsJson(
      request,
      { error: true, message: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { session, response } = await requireApiAuth(request);
    if (response) return response;
    const userId = session.session.userId;

    const validated = await validateBody(request, updateSchema);

    if ("response" in validated) return validated.response;
    const { statusName, labels: newLabels, ...rest } = validated.data;
    if (statusName) {
      rest.statusId = await getStatusIdByName(statusName);
    }
    // Sanitize note HTML on update as well — defense in depth so the DB
    // never persists executable markup, even if a client bypasses the
    // client-side sanitizer.
    if (rest.content != null) {
      rest.content = sanitizeNoteHtml(rest.content);
    }

    // When reminderAt is explicitly provided, sync the note's status:
    // setting a reminder → status becomes "reminder", clearing → back to "active"
    if ("reminderAt" in rest) {
      const activeStatusId = await getStatusIdByName(NOTE_STATUS.ACTIVE);
      const reminderStatusId = await getStatusIdByName(NOTE_STATUS.REMINDER);
      rest.statusId = rest.reminderAt ? reminderStatusId : activeStatusId;
    }

    const [existing] = await db
      .select({
        ownerId: notesTable.userId,
        image: notesTable.image,
        statusId: notesTable.statusId,
      })
      .from(notesTable)
      .where(eq(notesTable.id, rest.id))
      .limit(1);
    if (!existing) {
      return corsJson(
        request,
        { error: true, message: "Note not found" },
        { status: 404 },
      );
    }
    const isOwner = existing.ownerId === userId;

    // If image was removed, clean up the stored file
    if (existing.image && rest.image == null) {
      void deleteImage(existing.image);
    }
    let canEdit = isOwner;
    if (!isOwner) {
      const currentUserEmail = await getUserEmail(userId);
      const [share] = await db
        .select({ noteId: noteShares.noteId })
        .from(noteShares)
        .where(
          and(
            eq(noteShares.noteId, rest.id),
            eq(noteShares.sharedWithEmail, currentUserEmail ?? ""),
          ),
        )
        .limit(1);
      canEdit = Boolean(share);
    }
    if (!canEdit) {
      return corsJson(
        request,
        { error: true, message: "Forbidden" },
        { status: 403 },
      );
    }

    // A trashed note can never stay pinned. Pinned notes are hoisted into the
    // PINNED group of every list that renders them — including the views that
    // span statuses, such as label views — which would keep a deleted note on
    // screen. Force the flag off whenever the effective status of the note
    // (this update's status when given, the stored one otherwise) is trash.
    const trashStatusId = await getStatusIdByName(NOTE_STATUS.TRASH);
    const effectiveStatusId = rest.statusId ?? existing.statusId;
    if (effectiveStatusId === trashStatusId) {
      rest.pinned = false;
    }

    const res = await db
      .update(notesTable)
      .set(rest)
      .where(eq(notesTable.id, rest.id))
      .returning();

    if (newLabels !== undefined) {
      await syncNoteLabels(rest.id, userId, newLabels);
    }
    if (res.length > 0) {
      return corsJson(
        request,
        { error: false, message: "Note updated" },
        { status: 200 },
      );
    } else {
      return corsJson(
        request,
        { error: true, message: "update failed" },
        { status: 404 },
      );
    }
  } catch (error) {
    logger.error("Failed to update note", error, "API:notes");
    return corsJson(
      request,
      { error: true, message: "Update failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { session, response } = await requireApiAuth(request);
    if (response) return response;
    const userId = session.session.userId;

    const validated = validateSearchParams(request, deleteNoteQuerySchema);
    if ("response" in validated) return validated.response;
    const { id } = validated.data;

    let equals;
    if (id) {
      const [existing] = await db
        .select({ ownerId: notesTable.userId })
        .from(notesTable)
        .where(eq(notesTable.id, id))
        .limit(1);
      if (!existing) {
        return corsJson(
          request,
          { error: true, message: "Note not found" },
          { status: 404 },
        );
      }
      if (existing.ownerId === userId) {
        equals = eq(notesTable.id, id);
      } else {
        // Non-owner: remove their share instead of deleting the note.
        const currentUserEmail = await getUserEmail(userId);
        await db
          .delete(noteShares)
          .where(
            and(
              eq(noteShares.noteId, id),
              eq(noteShares.sharedWithEmail, currentUserEmail ?? ""),
            ),
          );

        return corsJson(
          request,
          { error: false, message: "Removed from shared notes" },
          { status: 200 },
        );
      }
    } else {
      const trashStatusId = await getStatusIdByName(NOTE_STATUS.TRASH);
      equals = and(
        eq(notesTable.statusId, trashStatusId),
        eq(notesTable.userId, userId),
      );
    }

    // Delete image files before removing DB records
    const deletedNotes = await db
      .delete(notesTable)
      .where(equals)
      .returning({ image: notesTable.image });

    // Clean up image files in background (don't block response)
    for (const note of deletedNotes) {
      if (note.image) {
        void deleteImage(note.image);
      }
    }

    return corsJson(
      request,
      { error: false, message: "Note(s) deleted" },
      { status: 200 },
    );
  } catch (error) {
    return corsJson(
      request,
      { error: true, message: "Delete failed" },
      { status: 500 },
    );
  }
}
