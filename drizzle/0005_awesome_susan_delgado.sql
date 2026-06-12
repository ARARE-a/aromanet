ALTER TABLE `story_posts` MODIFY COLUMN `therapistId` int;--> statement-breakpoint
ALTER TABLE `story_posts` ADD `storeId` int;--> statement-breakpoint
ALTER TABLE `story_posts` ADD `authorRole` enum('therapist','store') DEFAULT 'therapist' NOT NULL;--> statement-breakpoint
ALTER TABLE `story_posts` ADD CONSTRAINT `story_posts_storeId_stores_id_fk` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE no action ON UPDATE no action;