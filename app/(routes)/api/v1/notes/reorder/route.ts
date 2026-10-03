import { NextRequest } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/utils/config";
import { notesTable } from "@/db/schema";
import logger from "@/utils/logger";
import { corsJson } from "@/utils/cors";
import { requireApiAuth } from "@/utils/api";
import { validateBody } from "@/utils/validation";

const reorderSchema = z.array(
  z.object({ id: z.string().min(1), position: z.number().int() }),
);

export async function POST(request: NextRequest) {
  try {
    const { session, response } = await requireApiAuth(request);
    if (response) return response;

    const userId = session.session.userId;
    const validated = await validateBody(request, reorderSchema);
    if ("response" in validated) return validated.response;

    const items = validated.data;
    if (items.length > 0) {
      // `position` needs an explicit cast: with no ELSE arm Postgres infers
      // the untyped bind parameter as text and rejects the assignment.
      // The join separator is explicit because sql.join defaults to "".
      const caseStmt = sql`CASE ${notesTable.id} ${sql.join(
        items.map((item) => sql`WHEN ${item.id} THEN ${item.position}::int`),
        sql.raw(" "),
      )} ELSE ${notesTable.position} END`;

      await db
        .update(notesTable)
        .set({ position: caseStmt })
        .where(
          and(
            inArray(
              notesTable.id,
              items.map((item) => item.id),
            ),
            eq(notesTable.userId, userId),
          ),
        );
    }

    return corsJson(
      request,
      { error: false, message: "Notes reordered" },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Failed to reorder notes", error, "API:notes:reorder");
    return corsJson(
      request,
      { error: true, message: "Reordering failed" },
      { status: 500 },
    );
  }
}
