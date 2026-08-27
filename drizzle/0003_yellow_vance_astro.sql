CREATE TABLE `audit_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` integer NOT NULL,
	`property_id` integer,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`summary` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `owners`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_audit_owner_created` ON `audit_events` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`property_id` integer NOT NULL,
	`prospect_name` text NOT NULL,
	`phone` text NOT NULL,
	`expected_move_in` text NOT NULL,
	`preferred_sharing` text,
	`quoted_rent` integer DEFAULT 0 NOT NULL,
	`token_amount` integer DEFAULT 0 NOT NULL,
	`source` text,
	`notes` text,
	`status` text DEFAULT 'enquiry' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_bookings_property_status_move_in` ON `bookings` (`property_id`,`status`,`expected_move_in`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenancy_id` integer NOT NULL,
	`kind` text NOT NULL,
	`label` text NOT NULL,
	`storage_key` text,
	`original_name` text,
	`content_type` text,
	`size_bytes` integer,
	`verification_status` text DEFAULT 'requested' NOT NULL,
	`expires_on` text,
	`consent_recorded_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenancy_id`) REFERENCES `tenancies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_documents_tenancy_status` ON `documents` (`tenancy_id`,`verification_status`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`property_id` integer NOT NULL,
	`category` text NOT NULL,
	`amount` integer NOT NULL,
	`spent_on` text NOT NULL,
	`vendor` text,
	`reference` text,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_expenses_property_spent_on` ON `expenses` (`property_id`,`spent_on`);--> statement-breakpoint
CREATE TABLE `meter_readings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`property_id` integer NOT NULL,
	`room_no` text NOT NULL,
	`meter_name` text DEFAULT 'Electricity' NOT NULL,
	`period` text NOT NULL,
	`previous_reading` integer NOT NULL,
	`current_reading` integer NOT NULL,
	`rate_paise` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_meter_property_room_period` ON `meter_readings` (`property_id`,`room_no`,`meter_name`,`period`);--> statement-breakpoint
CREATE TABLE `notification_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`property_id` integer NOT NULL,
	`tenancy_id` integer,
	`channel` text NOT NULL,
	`kind` text NOT NULL,
	`recipient` text,
	`status` text DEFAULT 'prepared' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenancy_id`) REFERENCES `tenancies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_property_created` ON `notification_events` (`property_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `work_orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`property_id` integer NOT NULL,
	`tenancy_id` integer,
	`room_no` text,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`assignee` text,
	`cost` integer DEFAULT 0 NOT NULL,
	`due_on` text,
	`resolved_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenancy_id`) REFERENCES `tenancies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_work_orders_property_status` ON `work_orders` (`property_id`,`status`,`priority`);--> statement-breakpoint
ALTER TABLE `beds` ADD `floor_no` text;--> statement-breakpoint
ALTER TABLE `charges` ADD `description` text;--> statement-breakpoint
ALTER TABLE `charges` ADD `created_at` text;--> statement-breakpoint
ALTER TABLE `owners` ADD `platform_user_id` text;--> statement-breakpoint
ALTER TABLE `owners` ADD `display_name` text;--> statement-breakpoint
ALTER TABLE `owners` ADD `last_seen_at` text;--> statement-breakpoint
CREATE UNIQUE INDEX `owners_platform_user_id_unique` ON `owners` (`platform_user_id`);--> statement-breakpoint
ALTER TABLE `payments` ADD `status` text DEFAULT 'confirmed' NOT NULL;--> statement-breakpoint
ALTER TABLE `payments` ADD `idempotency_key` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `receipt_number` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `voided_at` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_payments_idempotency` ON `payments` (`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_payments_receipt_number` ON `payments` (`receipt_number`);--> statement-breakpoint
ALTER TABLE `properties` ADD `city` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `property_type` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `audience` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `rent_due_day` integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` ADD `grace_days` integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` ADD `late_fee` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` ADD `default_rent` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` ADD `default_security` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` ADD `notice_days` integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` ADD `agreement_required` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` ADD `verification_required` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` ADD `amenities_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` ADD `meal_plan` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `electricity_plan` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `climate_plan` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `bathroom_plan` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `timezone` text DEFAULT 'Asia/Kolkata' NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` ADD `updated_at` text;--> statement-breakpoint
ALTER TABLE `tenancies` ADD `email` text;--> statement-breakpoint
ALTER TABLE `tenancies` ADD `occupation` text;--> statement-breakpoint
ALTER TABLE `tenancies` ADD `hometown` text;--> statement-breakpoint
ALTER TABLE `tenancies` ADD `emergency_name` text;--> statement-breakpoint
ALTER TABLE `tenancies` ADD `emergency_phone` text;--> statement-breakpoint
ALTER TABLE `tenancies` ADD `notice_given_on` text;--> statement-breakpoint
ALTER TABLE `tenancies` ADD `planned_exit_on` text;--> statement-breakpoint
ALTER TABLE `tenancies` ADD `actual_exit_on` text;--> statement-breakpoint
ALTER TABLE `tenancies` ADD `deposit_refunded` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tenancies` ADD `updated_at` text;
--> statement-breakpoint
PRAGMA optimize;
