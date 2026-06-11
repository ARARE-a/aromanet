CREATE TABLE `affiliation_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`therapistId` int NOT NULL,
	`storeId` int NOT NULL,
	`status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
	`message` text,
	`responseNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `affiliation_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`name` varchar(50) NOT NULL,
	`description` text,
	`capacity` int NOT NULL DEFAULT 1,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rooms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `story_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`therapistId` int NOT NULL,
	`mediaUrl` text NOT NULL,
	`mediaType` enum('image','video') NOT NULL DEFAULT 'image',
	`caption` text,
	`viewCount` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `story_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `therapist_salary_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`therapistId` int NOT NULL,
	`storeId` int NOT NULL,
	`backRate` decimal(5,2) NOT NULL DEFAULT '50.00',
	`nominationFee` int NOT NULL DEFAULT 0,
	`adjustmentNote` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `therapist_salary_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_salary_settings_unique` UNIQUE(`therapistId`,`storeId`)
);
--> statement-breakpoint
ALTER TABLE `affiliation_requests` ADD CONSTRAINT `affiliation_requests_therapistId_therapists_id_fk` FOREIGN KEY (`therapistId`) REFERENCES `therapists`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `affiliation_requests` ADD CONSTRAINT `affiliation_requests_storeId_stores_id_fk` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rooms` ADD CONSTRAINT `rooms_storeId_stores_id_fk` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `story_posts` ADD CONSTRAINT `story_posts_therapistId_therapists_id_fk` FOREIGN KEY (`therapistId`) REFERENCES `therapists`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `therapist_salary_settings` ADD CONSTRAINT `therapist_salary_settings_therapistId_therapists_id_fk` FOREIGN KEY (`therapistId`) REFERENCES `therapists`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `therapist_salary_settings` ADD CONSTRAINT `therapist_salary_settings_storeId_stores_id_fk` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_affiliation_therapist` ON `affiliation_requests` (`therapistId`);--> statement-breakpoint
CREATE INDEX `idx_affiliation_store` ON `affiliation_requests` (`storeId`);