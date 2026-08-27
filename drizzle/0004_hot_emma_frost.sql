CREATE INDEX `idx_properties_owner` ON `properties` (`owner_id`);
--> statement-breakpoint
PRAGMA optimize;
