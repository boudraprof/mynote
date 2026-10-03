/**
 * How long a note stays recoverable in the trash before it is deleted for good.
 * A note's `updatedAt` is bumped when it moves to trash, so it doubles as the
 * "trashed at" timestamp the retention window is measured from.
 *
 * Shared by the server-side sweep (`trash.server.ts`) and the trash page notice
 * so the copy can never drift from the actual retention window.
 */
export const TRASH_RETENTION_DAYS = 7

export const TRASH_RETENTION_NOTICE = `Notes in trash are deleted after ${TRASH_RETENTION_DAYS} days`
