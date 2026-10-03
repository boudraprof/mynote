CREATE TABLE "note_status" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "note_status_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "notes" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "notes" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "status_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_status_id_note_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."note_status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notes_statusId_idx" ON "notes" USING btree ("status_id");--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN "archive";--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN "trash";