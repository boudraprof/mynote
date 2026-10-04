CREATE TABLE "note_history" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note_id" text NOT NULL,
	"title" text,
	"content" text,
	"checklist_items" text,
	"labels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"snapshot" jsonb NOT NULL,
	"timestamp" text NOT NULL,
	"change_type" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "note_shares" DROP CONSTRAINT "note_shares_shared_with_id_user_id_fk";
--> statement-breakpoint
DROP INDEX "note_shares_note_user_unique";--> statement-breakpoint
DROP INDEX "note_shares_shared_with_idx";--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "rate_limit" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "note_shares" ADD COLUMN "shared_with_email" text NOT NULL;--> statement-breakpoint
ALTER TABLE "note_history" ADD CONSTRAINT "note_history_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "note_history_noteId_idx" ON "note_history" USING btree ("note_id");--> statement-breakpoint
CREATE INDEX "note_history_timestamp_idx" ON "note_history" USING btree ("timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "note_shares_note_email_unique" ON "note_shares" USING btree ("note_id","shared_with_email");--> statement-breakpoint
CREATE INDEX "note_shares_shared_with_email_idx" ON "note_shares" USING btree ("shared_with_email");--> statement-breakpoint
ALTER TABLE "note_shares" DROP COLUMN "shared_with_id";--> statement-breakpoint
ALTER TABLE "note_shares" DROP COLUMN "permission";