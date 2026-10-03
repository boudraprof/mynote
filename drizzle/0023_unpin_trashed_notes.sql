--> statement-breakpoint
UPDATE "notes"
SET "pinned" = false
WHERE "pinned" = true
  AND "status_id" = (SELECT "id" FROM "note_status" WHERE "name" = 'trash');
