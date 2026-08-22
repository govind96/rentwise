CREATE TABLE `beds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`property_id` integer NOT NULL,
	`room_no` text NOT NULL,
	`bed_no` text NOT NULL,
	`monthly_rent` integer NOT NULL,
	`status` text DEFAULT 'vacant' NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_beds_property_room_bed` ON `beds` (`property_id`,`room_no`,`bed_no`);--> statement-breakpoint
CREATE INDEX `idx_beds_property_status` ON `beds` (`property_id`,`status`);--> statement-breakpoint
CREATE TABLE `charges` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenancy_id` integer NOT NULL,
	`kind` text NOT NULL,
	`period` text NOT NULL,
	`amount` integer NOT NULL,
	`due_on` text NOT NULL,
	`status` text DEFAULT 'due' NOT NULL,
	FOREIGN KEY (`tenancy_id`) REFERENCES `tenancies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_charges_tenancy_period` ON `charges` (`tenancy_id`,`period`);--> statement-breakpoint
CREATE INDEX `idx_charges_status_due` ON `charges` (`status`,`due_on`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenancy_id` integer NOT NULL,
	`amount` integer NOT NULL,
	`paid_on` text NOT NULL,
	`mode` text NOT NULL,
	`reference` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`tenancy_id`) REFERENCES `tenancies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_payments_tenancy_paid_on` ON `payments` (`tenancy_id`,`paid_on`);--> statement-breakpoint
CREATE TABLE `properties` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tenancies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bed_id` integer NOT NULL,
	`tenant_name` text NOT NULL,
	`phone` text,
	`allotment_date` text NOT NULL,
	`monthly_rent` integer NOT NULL,
	`security_amount` integer NOT NULL,
	`first_month_rent` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	FOREIGN KEY (`bed_id`) REFERENCES `beds`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_tenancies_bed_status` ON `tenancies` (`bed_id`,`status`);
--> statement-breakpoint
PRAGMA optimize;
