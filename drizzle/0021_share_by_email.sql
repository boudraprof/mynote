--> statement-breakpoint
ALTER TABLE "note_shares" ADD COLUMN "shared_with_email" text;
--> statement-breakpoint
UPDATE "note_shares"
SET "shared_with_email" = u."email"
FROM "user" u
WHERE "note_shares"."shared_with_id" = u."id";
--> statement-breakpoint
DELETE FROM "note_shares" WHERE "shared_with_email" IS NULL;
--> statement-breakpoint
ALTER TABLE "note_shares" ALTER COLUMN "shared_with_email" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "note_shares" DROP CONSTRAINT "note_shares_shared_with_id_user_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "note_shares_note_user_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "note_shares_shared_with_idx";
--> statement-breakpoint
ALTER TABLE "note_shares" DROP COLUMN "shared_with_id";
--> statement-breakpoint
CREATE UNIQUE INDEX "note_shares_note_email_unique" ON "note_shares" USING btree ("note_id","shared_with_email");
--> statement-breakpoint
CREATE INDEX "note_shares_shared_with_email_idx" ON "note_shares" USING btree ("shared_with_email");