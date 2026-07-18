import * as SQLite from 'expo-sqlite'
import { drizzle } from 'drizzle-orm/expo-sqlite'
import * as schema from './schema'

let db: ReturnType<typeof drizzle> | null = null

export async function getDb() {
  if (db) return db
  const sqlite = await SQLite.openDatabaseAsync('notes.db')
  await sqlite.execAsync(
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
      created_at TEXT,
      updated_at TEXT,
      synced INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      data TEXT,
      created_at TEXT
    );`,
  )
  db = drizzle(sqlite, { schema })
  return db
}
