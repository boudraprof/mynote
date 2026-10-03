import { NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/utils/config";
import { noteHistory, noteShares, notesTable } from "@/db/schema";
import { corsJson } from "@/utils/cors";
import { requireApiAuth } from "@/utils/api";
import { getUserEmail } from "@/utils/share";
import logger from "@/utils/logger";
import { validateBody, validateSearchParams } from "@/utils/validation";

const HISTORY_LIMIT = 50;

const saveHistorySchema = z.object({
  noteId: z.string().min(1),
  data: z.record(z.string(), z.unknown()),
  changeType: z.enum(["create", "update", "delete"]).default("update"),
});
const historyQuerySchema = z
  .object({
    id: z.string().min(1).optional(),
    noteId: z.string().min(1).optional(),
  })
  .refine(({ id, noteId }) => Boolean(id || noteId), {
    message: "noteId or id is required",
  });
const clearHistoryQuerySchema = z.object({
  noteId: z.uuid(),
});

/**
 * A user may read/write a note's history if they own it or the note has been
 * shared with them — mirrors the PUT handler's access rule.
 */
async function canAccessHistory(
  noteId: string,
  userId: string,
): Promise<boolean> {
  const [note] = await db
    .select({ ownerId: notesTable.userId })
    .from(notesTable)
    .where(eq(notesTable.id, noteId))
    .limit(1);
  if (!note) return false;
  if (note.ownerId === userId) return true;

  const currentUserEmail = await getUserEmail(userId);
  const [share] = await db
    .select({ noteId: noteShares.noteId })
    .from(noteShares)
    .where(
      and(
        eq(noteShares.noteId, noteId),
        eq(noteShares.sharedWithEmail, currentUserEmail ?? ""),
      ),
    )
    .limit(1);
  return Boolean(share);
}

export const GET = async (request: NextRequest) => {

  try {
  const { session, response } = await requireApiAuth(request);
  if (response) return response;
  const userId = session.session.userId;
  const validated = validateSearchParams(request, historyQuerySchema);
  if ("response" in validated) return validated.response;
  const { id: versionId, noteId } = validated.data;

    if (versionId) {
      const [version] = await db
        .select()
        .from(noteHistory)
        .where(eq(noteHistory.id, versionId))
        .limit(1);
      if (!version) {
        return corsJson(
          request,
          { error: true, message: "Version not found" },
          { status: 404 },
        );
      }
      if (!(await canAccessHistory(version.noteId, userId))) {
        return corsJson(
          request,
          { error: true, message: "Forbidden" },
          { status: 403 },
        );
      }
      return corsJson(request, { data: version }, { status: 200 });
    }

    if (!(await canAccessHistory(noteId!, userId))) {
      return corsJson(
        request,
        { error: true, message: "Forbidden" },
        { status: 403 },
      );
    }
    const versions = await db
      .select()
      .from(noteHistory)
      .where(eq(noteHistory.noteId, noteId!))
      .orderBy(desc(noteHistory.timestamp))
      .limit(HISTORY_LIMIT);
    return corsJson(request, { data: versions }, { status: 200 });
  } catch (error) {
    logger.error("Failed to fetch note history", error, "API:notes:history");
    return corsJson(
      request,
      { error: true, message: "Failed to fetch history" },
      { status: 500 },
    );
  }
};

export const POST = async ( request: NextRequest) => {
  try {
  const { session, response } = await requireApiAuth(request);
  if (response) return response;
  const userId = session.session.userId;
  const validated = await validateBody(request, saveHistorySchema);
  if ("response" in validated) return validated.response;
  const body = validated.data;

  if (!(await canAccessHistory(body.noteId, userId))) {
    return corsJson(
      request,
      { error: true, message: "Forbidden" },
      { status: 403 },
    );
  }

   const res = await db.insert(noteHistory).values({
      noteId: body.noteId,
      title: typeof body.data.title === "string" ? body.data.title : null,
      content: typeof body.data.content === "string" ? body.data.content : null,
      checklistItems:
        typeof body.data.checklistItems === "string"
          ? body.data.checklistItems
          : null,
      labels: Array.isArray(body.data.labels)
        ? (body.data.labels as Array<string>)
        : [],
      snapshot: body.data,
      timestamp: new Date().toISOString(),
      changeType: body.changeType,
    }).returning({ id: noteHistory.id });

    return corsJson(
      request,
      { error: false, message: "Version saved", id: res[0].id },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Failed to save note history", error, "API:notes:history");
    return corsJson(
      request,
      { error: true, message: "Failed to save history" },
      { status: 500 },
    );
  }
};
export const DELETE = async (request: NextRequest) => {
  try {
  const { session, response } = await requireApiAuth(request);
  if (response) return response;
  const userId = session.session.userId;
  const validated = validateSearchParams(request, clearHistoryQuerySchema);
  if ("response" in validated) return validated.response;
  const { noteId } = validated.data;

  if (!(await canAccessHistory(noteId, userId))) {
    return corsJson(
      request,
      { error: true, message: "Forbidden" },
      { status: 403 },
    );
  }

  const res =  await db.delete(noteHistory).where(eq(noteHistory.noteId, noteId)).returning({ id: noteHistory.id });
  if(res.length === 0) {
    return corsJson(
      request,
      { error: true, message: "No history found to clear" },
      { status: 404 },
    );
  } 
  
  return corsJson(
      request,
      { error: false, message: "History cleared" },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Failed to clear note history", error, "API:notes:history");
    return corsJson(
      request,
      { error: true, message: "Failed to clear history" },
      { status: 500 },
    );
  }
};

 