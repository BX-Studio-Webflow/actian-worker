CREATE TABLE `download_grants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`trial_lead_id` integer NOT NULL,
	`token` text NOT NULL,
	`requested_file` text NOT NULL,
	`r2_object_key` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`expires_at` integer NOT NULL,
	`downloaded_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`trial_lead_id`) REFERENCES `trial_leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `download_grants_token_unique` ON `download_grants` (`token`);--> statement-breakpoint
CREATE INDEX `download_grants_trial_lead_id_index` ON `download_grants` (`trial_lead_id`);--> statement-breakpoint
CREATE INDEX `download_grants_active_expiry_index` ON `download_grants` (`status`,`expires_at`);--> statement-breakpoint
CREATE TABLE `marketo_webhook_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`trial_lead_id` integer NOT NULL,
	`marketo_lead_id` text,
	`payload` text NOT NULL,
	`status` text DEFAULT 'received' NOT NULL,
	`error` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`trial_lead_id`) REFERENCES `trial_leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `marketo_webhook_events_trial_lead_id_index` ON `marketo_webhook_events` (`trial_lead_id`);--> statement-breakpoint
CREATE INDEX `marketo_webhook_events_marketo_lead_id_index` ON `marketo_webhook_events` (`marketo_lead_id`);--> statement-breakpoint
CREATE TABLE `trial_leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email_hash` text NOT NULL,
	`marketo_lead_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trial_leads_email_hash_unique` ON `trial_leads` (`email_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `trial_leads_marketo_lead_id_unique` ON `trial_leads` (`marketo_lead_id`);