import * as SQLite from 'expo-sqlite'
import { drizzle } from 'drizzle-orm/expo-sqlite'
import * as schema from './schema'

let db: ReturnType<typeof drizzle> | null = null
let initPromise: Promise<void> | null = null

/**
 * Get the drizzle database instance. Initializes the SQLite database on first call.
 * Uses a promise guard to prevent concurrent initialization.
 */
export async function getDb() {
  if (db) return db

  if (!initPromise) {
    initPromise = (async () => {
      // Use openDatabaseSync since the drizzle expo-sqlite driver uses sync methods
      const sqlite = SQLite.openDatabaseSync('notes.db')

      sqlite.execSync(
        `CREATE TABLE IF NOT EXISTS notes (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL DEFAULT 'local',
          status_id TEXT,
          title TEXT,
          content TEXT,
          image TEXT,
          labels TEXT,
          pinned INTEGER DEFAULT 0,
          position INTEGER DEFAULT 0,
          checklist INTEGER DEFAULT 0,
          checklist_items TEXT,
          palette TEXT,
          status_name TEXT,
          reminder_at TEXT,
          created_at TEXT,
          updated_at TEXT,
          synced INTEGER DEFAULT 0
        )`,
      )

      // Migrate older installs that predate the reminder_at column
      const noteCols = sqlite.getAllSync('PRAGMA table_info(notes)') as {
        name: string
      }[]
      if (!noteCols.some((c) => c.name === 'reminder_at')) {
        sqlite.execSync('ALTER TABLE notes ADD COLUMN reminder_at TEXT')
      }

      sqlite.execSync(
        `CREATE TABLE IF NOT EXISTS sync_queue (
          id TEXT PRIMARY KEY,
          note_id TEXT NOT NULL,
          operation TEXT NOT NULL,
          data TEXT,
          created_at TEXT
        )`,
      )

      // Created here rather than by drizzle-kit: the app applies its schema
      // with hand-written DDL on startup (the bundled migration predates this
      // table), so history saves/reads failed with "no such table".
      sqlite.execSync(
        `CREATE TABLE IF NOT EXISTS note_history (
          id TEXT PRIMARY KEY,
          note_id TEXT NOT NULL,
          title TEXT,
          content TEXT,
          checklist_items TEXT,
          labels TEXT,
          snapshot TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          change_type TEXT NOT NULL
        )`,
      )
      sqlite.execSync(
        `CREATE INDEX IF NOT EXISTS note_history_note_id_idx
         ON note_history (note_id)`,
      )

      db = drizzle(sqlite, { schema })
    })()
  }

  await initPromise
  return db!
}
