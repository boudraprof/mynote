CREATE TABLE `notes` (
	`id` text PRIMARY KEY,
	`user_id` text DEFAULT 'local' NOT NULL,
	`status_id` text,
	`title` text,
	`content` text,
	`image` text,
	`labels` text,
	`pinned` integer DEFAULT false,
	`position` integer DEFAULT 0,
	`checklist` integer DEFAULT false,
	`checklist_items` text,
	`palette` text,
	`status_name` text,
	`created_at` text,
	`updated_at` text,
	`synced` integer DEFAULT false
);
--> statement-breakpoint
CREATE TABLE `sync_queue` (
	`id` text PRIMARY KEY,
	`note_id` text NOT NULL,
	`operation` text NOT NULL,
	`data` text,
	`created_at` text
);
