ALTER TABLE `shifts` ADD COLUMN `approvalStatus` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `shifts` ADD COLUMN `reviewedAt` timestamp NULL;--> statement-breakpoint
ALTER TABLE `shifts` ADD COLUMN `reviewedByStoreId` int;--> statement-breakpoint
ALTER TABLE `shifts` ADD COLUMN `reviewNote` text;--> statement-breakpoint
ALTER TABLE `messages` ADD COLUMN `deletedForStore` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `messages` ADD COLUMN `deletedForTherapist` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `messages` ADD COLUMN `deletedForCustomer` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `messages` ADD COLUMN `deletedAt` timestamp NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD COLUMN `deletedByRole` varchar(20);--> statement-breakpoint
ALTER TABLE `messages` ADD COLUMN `deletedById` int;
