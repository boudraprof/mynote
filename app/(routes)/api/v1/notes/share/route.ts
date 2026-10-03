import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/utils/config";
import { noteShares, notesTable, user } from "@/db/schema";
import { corsJson } from "@/utils/cors";
import { requireApiAuth } from "@/utils/api";
import { getUserEmail } from "@/utils/share";
import { sendEmail } from "@/utils/email";
import { sharedNoteEmail } from "@/utils/email_templates";
import { NextRequest } from "next/server";
import { validateBody, validateSearchParams } from "@/utils/validation";

const shareSchema = z.object({
  noteId: z.uuid(),
  email: z.email(),
});
const shareQuerySchema = z.object({ noteId: z.uuid() });

export const GET = async (request: NextRequest) => {
  try {
    const { session, response } = await requireApiAuth(request);
    if (response) return response;
    const userId = session.session.userId;
    const validated = validateSearchParams(request, shareQuerySchema);
    if ("response" in validated) return validated.response;
    const { noteId } = validated.data;

    const [note] = await db
      .select({ ownerId: notesTable.userId })
      .from(notesTable)
      .where(eq(notesTable.id, noteId))
      .limit(1);
    if (!note || note.ownerId !== userId) {
      return corsJson(
        request,
        { error: true, message: "Forbidden" },
        { status: 403 },
      );
    }

    const shares = await db
      .select({
        id: noteShares.id,
        email: noteShares.sharedWithEmail,
        name: user.name,
      })
      .from(noteShares)
      .leftJoin(user, eq(user.email, noteShares.sharedWithEmail))
      .where(eq(noteShares.noteId, noteId));
    console.log("shares", shares, "note", note);
    return corsJson(request, { data: shares }, { status: 200 });
  } catch (error) {
    return corsJson(
      request,
      { error: true, message: "Failed to fetch shared note" },
      { status: 500 },
    );
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const { session, response } = await requireApiAuth(request);
    if (response) return response;
    const userId = session.session.userId;
    const validated = await validateBody(
      request,
      shareSchema,
      "noteId and email are required",
    );

    if ("response" in validated) return validated.response;
    const { email, noteId } = validated.data;

    const [note] = await db
      .select({ ownerId: notesTable.userId, title: notesTable.title })
      .from(notesTable)
      .where(eq(notesTable.id, noteId))
      .limit(1);
    if (!note) {
      return corsJson(
        request,
        { error: true, message: "Note not found" },
        { status: 404 },
      );
    }
    if (note.ownerId !== userId) {
      return corsJson(
        request,
        { error: true, message: "Only the owner can share this note" },
        { status: 403 },
      );
    }

    const sharedWithEmail = email.trim().toLowerCase();
    const ownerEmail = await getUserEmail(userId);
    if (ownerEmail && ownerEmail.toLowerCase() === sharedWithEmail) {
      return corsJson(
        request,
        { error: true, message: "You cannot share a note with yourself" },
        { status: 400 },
      );
    }

    const res = await db
      .select({ sharedWithEmail: noteShares.sharedWithEmail})
      .from(noteShares)
      .where(eq(noteShares.sharedWithEmail, sharedWithEmail));

    if (res.length > 0) {
      return corsJson(
        request,
        { error: true, message: `This Note already sent to this email`},
        { status: 404 },
      );
    }

    await db
      .insert(noteShares)
      .values({
        noteId: noteId,
        ownerId: userId,
        sharedWithEmail,
      })
      .onConflictDoNothing({
        target: [noteShares.noteId, noteShares.sharedWithEmail],
      });

    await sendEmail({
      to: sharedWithEmail,
      subject: "A note was shared with you",
      text: `Someone shared the note "${note.title ?? "Untitled"}" with you on My Notes. Log in to view and edit it.`,
      html: sharedNoteEmail(note.title),
    });

    return corsJson(
      request,
      { error: false, message: "Note shared" },
      { status: 200 },
    );
  } catch (error) {
    return corsJson(
      request,
      { error: true, message: "Failed to share  note" },
      { status: 500 },
    );
  }
};

export const DELETE = async (request: NextRequest) => {
  try {
    const { session, response } = await requireApiAuth(request);
    if (response) return response;

    const userId = session.session.userId;
    const validated = await validateBody(
      request,
      shareSchema,
      "noteId and email are required",
    );
    if ("response" in validated) return validated.response;
    const { noteId, email } = validated.data;

    const [note] = await db
      .select({ ownerId: notesTable.userId })
      .from(notesTable)
      .where(eq(notesTable.id, noteId))
      .limit(1);
    if (!note || note.ownerId !== userId) {
      return corsJson(
        request,
        { error: true, message: "Forbidden" },
        { status: 403 },
      );
    }

    const res = await db
      .delete(noteShares)
      .where(
        and(
          eq(noteShares.noteId, noteId),
          eq(noteShares.sharedWithEmail, email.trim().toLowerCase()),
        ),
      )
      .returning();
    if (res.length > 0) {
      return corsJson(
        request,
        { error: false, message: "Share removed" },
        { status: 200 },
      );
    } else {
      return corsJson(
        request,
        { error: false, message: "Shared note not Found" },
        { status: 404 },
      );
    }
  } catch (error) {
    return corsJson(
      request,
      { error: true, message: "Failed to delete shared note" },
      { status: 500 },
    );
  }
};
