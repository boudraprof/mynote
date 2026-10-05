import { NextRequest } from "next/server";
import { z } from "zod";

import { db } from "@/utils/config";
import {  notesTable } from "@/db/schema";
import logger from "@/utils/logger";
import { corsJson } from "@/utils/cors";
import { requireApiAuth } from "@/utils/api";
import { sanitizeNoteHtml } from "@/utils/sanitize";
import { NOTE_STATUS } from "@/utils/status";
import { getStatusIdByName } from "@/utils/status.server";
import { validateBody } from "@/utils/validation";
import { apiNoteSchema, syncNoteLabels } from "@/utils/server-only";




export async function POST(request: NextRequest) {
  try {
    const { session, response } = await requireApiAuth(request);
    if (response) return response;

    const userId = session.session.userId;
    const validated = await validateBody(request, apiNoteSchema);
    if ("response" in validated) return validated.response;

    const data = validated.data;
    const activeStatusId = await getStatusIdByName(NOTE_STATUS.ACTIVE);

    const [inserted] = await db
      .insert(notesTable)
      .values({
        userId,
        statusId: activeStatusId,
        title: data.title ? `${data.title} (copy)` : "Untitled (copy)",
        content: data.content ? sanitizeNoteHtml(data.content) : data.content,
        image: data.image,
        pinned: false,
      })
      .returning();

    if (data.labels && data.labels.length > 0) {
      if (!inserted) throw new Error("Insert failed");
      await syncNoteLabels(inserted.id, userId, data.labels);
    }

    return corsJson(
      request,
      { error: false, message: "Note copied successfully" },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Failed to copy note", error, "API:notes:copy");
    return corsJson(
      request,
      { error: true, message: "Copying note failed" },
      { status: 500 },
    );
  }
}
