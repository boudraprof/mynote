ALTER TABLE "notes" ADD COLUMN "image" text;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "content" varchar(2000);--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "created_at" timestamp;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN "createAt";--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN "updateAt";