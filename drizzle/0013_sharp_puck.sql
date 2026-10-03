CREATE TABLE "note_labels" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "note_labels_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "notes_labels" (
	"note_id" text NOT NULL,
	"label_id" text NOT NULL,
	CONSTRAINT "notes_labels_note_id_label_id_pk" PRIMARY KEY("note_id","label_id")
);
--> statement-breakpoint
ALTER TABLE "notes" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "notes" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "notes_labels" ADD CONSTRAINT "notes_labels_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes_labels" ADD CONSTRAINT "notes_labels_label_id_note_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."note_labels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN "labels";