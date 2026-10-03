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
ALTER TABLE "note_history" ADD CONSTRAINT "note_history_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "note_history_noteId_idx" ON "note_history" USING btree ("note_id");--> statement-breakpoint
CREATE INDEX "note_history_timestamp_idx" ON "note_history" USING btree ("timestamp");
