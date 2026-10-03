ALTER TABLE "note_labels" DROP CONSTRAINT "note_labels_name_unique";--> statement-breakpoint
ALTER TABLE "note_labels" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "note_labels" ADD CONSTRAINT "note_labels_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "note_labels_userId_idx" ON "note_labels" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "note_labels_userId_name_unique" ON "note_labels" USING btree ("user_id","name");