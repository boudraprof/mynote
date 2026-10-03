import { and, count, eq, ilike, inArray, or } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

import { db } from "@/utils/config";
import { noteLabels, noteStatus, notesLabels, notesTable } from "@/db/schema";
import { corsJson } from "@/utils/cors";
import { requireApiAuth } from "@/utils/api";
import logger from "@/utils/logger";
import { validateSearchParams } from "@/utils/validation";

const searchParamsSchema = z.object({
  q: z.string().min(1).max(500),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export const GET = async (request: NextRequest) => {
  const { session, response } = await requireApiAuth(request);
  if (response) return response;

  const validated = validateSearchParams(request, searchParamsSchema);
  if ("response" in validated) return validated.response;
  const { q: query, limit, offset } = validated.data;
  // Escape LIKE wildcards so user input is matched literally
  const escaped = query.replace(/([%_\\])/g, "\\$1");
  const pattern = `%${escaped}%`;
  const matchCondition = and(
    eq(notesTable.userId, session.session.userId),
    or(
      ilike(notesTable.title, pattern),
      ilike(notesTable.content, pattern),
      ilike(notesTable.checklistItems, pattern),
      inArray(
        notesTable.id,
        db
          .select({ noteId: notesLabels.noteId })
          .from(notesLabels)
          .innerJoin(noteLabels, eq(notesLabels.labelId, noteLabels.id))
          .where(
            and(
              eq(noteLabels.userId, session.session.userId),
              ilike(noteLabels.name, pattern),
            ),
          ),
      ),
    ),
  );
  try {
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
        createdAt: notesTable.createdAt,
        updatedAt: notesTable.updatedAt,
        StatusName: noteStatus.name,
      })
      .from(notesTable)
      .leftJoin(noteStatus, eq(notesTable.statusId, noteStatus.id))
      .where(matchCondition)
      .limit(limit)
      .offset(offset);

    const noteIds = res.map((n) => n.id);
    const labelsByNoteId = new Map<string, Array<string>>();
    if (noteIds.length > 0) {
      const labelRows = await db
        .select({
          noteId: notesLabels.noteId,
          name: noteLabels.name,
        })
        .from(notesLabels)
        .innerJoin(noteLabels, eq(notesLabels.labelId, noteLabels.id))
        .where(inArray(notesLabels.noteId, noteIds));
      for (const row of labelRows) {
        const labels = labelsByNoteId.get(row.noteId) ?? [];
        labels.push(row.name);
        labelsByNoteId.set(row.noteId, labels);
      }
    }

    const data = res.map((note) => ({
      ...note,
      labels: labelsByNoteId.get(note.id) ?? [],
    }));

    const total = await db
      .select({ count: count() })
      .from(notesTable)
      .where(matchCondition);
    return corsJson(
      request,
      { data, total: total[0]?.count || 0, limit, offset },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Search query failed", error, "API:search");
    return corsJson(
      request,
      { error: true, message: "Search failed" },
      { status: 500 },
    );
  }
};
