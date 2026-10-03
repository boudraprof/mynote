import 'dotenv/config'

import { eq } from 'drizzle-orm'

import { db } from '@/utils/config'
import { noteStatus } from '@/db/schema'

async function seedNoteStatus() {
  try {
    console.log('🌱 Starting note status seed...')

    // Check if 'active' status already exists
    for (const value of ['active', 'archived', 'trash']) {
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
  } finally {
    // await client.end()
  }
}

seedNoteStatus()
