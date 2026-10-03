"server only"

import { notesLabels, noteLabels } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "./config";
import z from "zod";
import { NOTE_STATUS } from "./bgs-colors";
import { corsJson } from "./cors";


export const apiNoteSchema = z.object({
  title: z.string().max(255).optional().nullable(),
  content: z.string().max(10000).optional().nullable(),
  image: z
    .string()
    .refine(
      (v) =>
        /^https?:\/\//.test(v) ||
        v.startsWith("data:") ||
        v.startsWith("blob:") ||
        v.startsWith("/uploads/"),
      { message: "image must be an http(s), data:, blob:, or /uploads/ URL" },
    )
    .optional()
    .nullable(),
  labels: z.array(z.string()).optional(),
  statusId: z.string().optional(),
  statusName: z.enum(NOTE_STATUS).optional(),
  pinned: z.boolean().optional(),
  position: z.number().int().optional(),
  checklist: z.boolean().optional(),
  checklistItems: z.string().optional().nullable(),
  palette: z.string().optional().nullable(),
  reminderAt: z.coerce.date().optional().nullable(),
});

export async function syncNoteLabels(
  noteId: string,
  userId: string,
  labelNames: Array<string>,
) {
  await db.delete(notesLabels).where(eq(notesLabels.noteId, noteId));

  const trimmed = labelNames.map((n) => n.trim()).filter(Boolean);
  if (trimmed.length === 0) return;

  // 1) Fetch all existing labels for this user that match the given names.
  const existingLabels = await db
    .select({ id: noteLabels.id, name: noteLabels.name })
    .from(noteLabels)
    .where(
      and(eq(noteLabels.userId, userId), inArray(noteLabels.name, trimmed)),
    );

  const existingByName = new Map(existingLabels.map((l) => [l.name, l.id]));

  // 2) Create any labels that don't exist yet (single batch insert).
  const missingNames = trimmed.filter((n) => !existingByName.has(n));
  if (missingNames.length > 0) {
    const batchResult = await db
      .insert(noteLabels)
      .values(missingNames.map((name) => ({ userId, name })))
      .returning({ id: noteLabels.id, name: noteLabels.name });

    for (const label of batchResult) {
      existingByName.set(label.name, label.id);
    }
  }

  // 3) Insert joins in one batch.
  const joinValues = trimmed.map((name) => ({
    noteId,
    labelId: existingByName.get(name)!,
  }));

  await db.insert(notesLabels).values(joinValues);
}

export const unauthorized = (request: Request): Response => {
  return corsJson(
    request,
    { error: true, message: "Unauthorized" },
    { status: 401 },
  );
};
