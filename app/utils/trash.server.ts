import { and, eq, lt } from 'drizzle-orm'

import { notesTable } from '@/db/schema'
import { NOTE_STATUS } from '@/utils/status'
import { db } from '@/utils/config'
import { deleteImage } from '@/utils/image-storage'
import logger from '@/utils/logger'
import { getStatusIdByName } from '@/utils/status.server'
import { TRASH_RETENTION_DAYS } from '@/utils/trash'

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Permanently delete every note that has been in the trash longer than the
 * retention window, for all users.
 *
 * There is no scheduler in this project, so the sweep rides along on the notes
 * read path. That also means trash stays bounded for accounts that rarely open
 * the trash view themselves.
 *
 * Failures are swallowed: a failed sweep must never break reading notes, it only
 * means the next read tries again.
 */
export async function purgeExpiredTrash(): Promise<number> {
  try {
    const trashStatusId = await getStatusIdByName(NOTE_STATUS.TRASH)
    const expiredBefore = new Date(Date.now() - TRASH_RETENTION_DAYS * MS_PER_DAY)

    const deleted = await db
      .delete(notesTable)
      .where( 
        and(
          eq(notesTable.statusId, trashStatusId),
          lt(notesTable.updatedAt, expiredBefore),
        ),
      )
      .returning({ image: notesTable.image })

    // Clean up image files in background (don't block the read)
    for (const note of deleted) {
      if (note.image) {
        void deleteImage(note.image)
      }
    }

    return deleted.length
  } catch (error) {
    logger.error('Failed to purge expired trash notes', error, 'API:notes')
    return 0
  }
}
