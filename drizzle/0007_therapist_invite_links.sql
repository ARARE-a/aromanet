CREATE TABLE IF NOT EXISTS `therapist_invite_links` (
  `id` int AUTO_INCREMENT NOT NULL,
  `storeId` int NOT NULL,
  `token` varchar(80) NOT NULL,
  `label` varchar(100),
  `isActive` boolean NOT NULL DEFAULT true,
  `maxUses` int,
  `usedCount` int NOT NULL DEFAULT 0,
  `expiresAt` timestamp NULL,
  `lastUsedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `therapist_invite_links_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_therapist_invite_token` ON `therapist_invite_links` (`token`);--> statement-breakpoint
CREATE INDEX `idx_therapist_invite_store` ON `therapist_invite_links` (`storeId`);
