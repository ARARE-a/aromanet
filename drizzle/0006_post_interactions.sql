ALTER TABLE `favorites` MODIFY COLUMN `targetType` enum('store','therapist','post') NOT NULL;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `post_comments` (
  `id` int AUTO_INCREMENT NOT NULL,
  `postId` int NOT NULL,
  `customerId` int NOT NULL,
  `comment` text NOT NULL,
  `isHidden` boolean NOT NULL DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `post_comments_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
CREATE INDEX `idx_post_comments_post` ON `post_comments` (`postId`);
