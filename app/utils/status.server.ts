import { eq } from 'drizzle-orm'
import type {NoteStatusType} from '@/types';
import { NOTE_STATUS  } from '@/utils/bgs-colors'
import { db } from '@/utils/config'
import { noteStatus } from '@/db/schema'

// Simple in-memory cache for status lookups
const statusCache = new Map<string, string>()

async function seedNoteStatus() {
  try {
    console.log('🌱 Starting note status seed...')

    // Check if 'active' status already exists
    for (const value in NOTE_STATUS) {
      const existingStatus = await db
        .select()
        .from(noteStatus)
        .where(eq(noteStatus.name, value))

      if (existingStatus.length > 0) {
        console.log(`✅ ${value} status already exists`)
      } else {
        // Insert default status
        const result = await db
          .insert(noteStatus)
          .values({
            name: value,
          })
          .returning()
        if (result.length) console.log(`The ${value} status inserted ✅ `)
      }
    }

    console.log('✅ Successfully seeded note status')
  } catch (error) {
    console.error('❌ Error seeding note status:', error)
    throw error
  }
}

export async function getStatusIdByName(
  statusName: NoteStatusType | string,
): Promise<string> {
  // Check cache first
  try {
    
  if (statusCache.has(statusName)) {
    return statusCache.get(statusName)!
  }

    const status = await db.query.noteStatus.findFirst({
      where: eq(noteStatus.name, statusName),
    })

    if (!status) {
      await seedNoteStatus()
      const newStatus = await db.query.noteStatus.findFirst({
        where: eq(noteStatus.name, statusName),
      })
      if (newStatus) {
        statusCache.set(statusName, newStatus.id)
        return newStatus.id
      }
      throw new Error(`Status '${statusName}' not found after seeding`)
    }

    // Cache the result
    statusCache.set(statusName, status.id)
    return status.id
  } catch (error) {
    console.error(`Error fetching status ${statusName}:`, error)
    throw error
  }
}

export function clearStatusCache() {
  statusCache.clear()
}
