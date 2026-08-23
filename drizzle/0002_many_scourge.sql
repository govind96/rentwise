CREATE TABLE `owners` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `owners_email_unique` ON `owners` (`email`);--> statement-breakpoint
ALTER TABLE `properties` ADD `owner_id` integer NOT NULL REFERENCES owners(id);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_charges_tenancy_kind_period` ON `charges` (`tenancy_id`,`kind`,`period`);