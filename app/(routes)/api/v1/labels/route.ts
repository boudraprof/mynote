import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { NextRequest } from "next/server";

import { db } from "@/utils/config";
import { noteLabels } from "@/db/schema";
import { corsJson } from "@/utils/cors";
import { requireApiAuth } from "@/utils/api";
import { validateBody, validateSearchParams } from "@/utils/validation";
import logger from "@/utils/logger";

export const GET = async (request: NextRequest) => {
  try {
    const { session, response } = await requireApiAuth(request);
    if (response) return response;
    const userId = session.session.userId;

    const labels = await db
      .select({ id: noteLabels.id, name: noteLabels.name })
      .from(noteLabels)
      .where(eq(noteLabels.userId, userId))
      .orderBy(noteLabels.name);

    return corsJson(request, { data: labels }, { status: 200 });
  } catch (error) {
    logger.error("Failed to fetch labels", error, "API:labels");
    return corsJson(
      request,
      { error: true, message: "Failed to fetch labels" },
      { status: 500 },
    );
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const { session, response } = await requireApiAuth(request);
    if (response) return response;
    const userId = session.session.userId;

    const labelCreateSchema = z.object({
      name: z
        .string()
        .min(1, "Label name is required")
        .max(50, "Label name too long"),
    });

    const result = await validateBody(request, labelCreateSchema);

    if ("response" in result) return result.response;
    const name = result.data.name.trim();

    const [existing] = await db
      .select()
      .from(noteLabels)
      .where(and(eq(noteLabels.userId, userId), eq(noteLabels.name, name)))
      .limit(1);

    if (existing != null) {
      return corsJson(
        request,
        { error: true, message: "Label already exists" },
        { status: 409 },
      );
    }

    const [inserted] = await db
      .insert(noteLabels)
      .values({ userId, name })
      .returning({ id: noteLabels.id, name: noteLabels.name });

    return corsJson(request, { data: inserted }, { status: 201 });
  } catch (error) {
    logger.error("Failed to create label", error, "API:labels");
    return corsJson(
      request,
      { error: true, message: "Failed to create label" },
      { status: 500 },
    );
  }
};

export const PUT = async (request: NextRequest) => {
  try {
    const { session, response } = await requireApiAuth(request);
    if (response) return response;
    const userId = session.session.userId;

    const labelUpdateSchema = z.object({
      id: z.string().min(1, "Label ID is required"),
      name: z
        .string()
        .min(1, "Label name is required")
        .max(50, "Label name too long"),
    });

    const result = await validateBody(request, labelUpdateSchema);
    if ("response" in result) return result.response;
    const { id, name } = result.data;

    const [updated] = await db
      .update(noteLabels)
      .set({ name: name.trim() })
      .where(and(eq(noteLabels.id, id), eq(noteLabels.userId, userId)))
      .returning({ id: noteLabels.id, name: noteLabels.name });

    if (!updated) {
      return corsJson(
        request,
        { error: true, message: "Label not found" },
        { status: 404 },
      );
    }

    return corsJson(request, { data: updated }, { status: 200 });
  } catch (error) {
    logger.error("Failed to update label", error, "API:labels");
    return corsJson(
      request,
      { error: true, message: "Failed to update label" },
      { status: 500 },
    );
  }
};

export const DELETE = async (request: NextRequest) => {
  try {
    const { session, response } = await requireApiAuth(request);
    if (response) return response;
    const userId = session.session.userId;

    const validated = validateSearchParams(
      request,
      z.object({ id: z.string().min(1, "Label id is required") }),
    );
    if ("response" in validated) return validated.response;
    const { id } = validated.data;

    const res = await db
      .delete(noteLabels)
      .where(and(eq(noteLabels.id, id), eq(noteLabels.userId, userId)))
      .returning({ id: noteLabels.id });
    if (res.length === 0) {
      return corsJson(
        request,
        { error: false, message: "Label not Found" },
        { status: 404 },
      );
    }
    return corsJson(
      request,
      { error: false, message: "Label deleted" },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Failed to delete label", error, "API:labels");
    return corsJson(
      request,
      { error: true, message: "Failed to delete label" },
      { status: 500 },
    );
  }
};
