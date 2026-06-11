CREATE TABLE `age_verifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`method` varchar(50),
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `age_verifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorRole` enum('store','therapist','customer','admin') NOT NULL,
	`actorId` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`targetType` varchar(50),
	`targetId` int,
	`detail` text,
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`blockerRole` enum('store','therapist','customer') NOT NULL,
	`blockerId` int NOT NULL,
	`blockedRole` enum('store','therapist','customer') NOT NULL,
	`blockedId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `blocks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`discountType` enum('fixed','percent') NOT NULL,
	`discountValue` int NOT NULL,
	`minAmount` int NOT NULL DEFAULT 0,
	`maxUses` int,
	`usedCount` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp,
	`isPublic` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`crashPasswordHash` varchar(255),
	`twoFactorSecret` varchar(64),
	`twoFactorEnabled` boolean NOT NULL DEFAULT false,
	`ageVerified` boolean NOT NULL DEFAULT false,
	`ageVerifiedAt` timestamp,
	`status` enum('active','suspended','deleted') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `customer_accounts_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `customer_levels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`level` int NOT NULL,
	`name` varchar(50) NOT NULL,
	`minAmount` int NOT NULL,
	`badgeColor` varchar(20) NOT NULL,
	`benefits` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_levels_id` PRIMARY KEY(`id`),
	CONSTRAINT `customer_levels_level_unique` UNIQUE(`level`)
);
--> statement-breakpoint
CREATE TABLE `customer_memos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`therapistId` int NOT NULL,
	`customerId` int NOT NULL,
	`preferences` text,
	`caution` text,
	`lastVisitNote` text,
	`repeatStatus` varchar(50),
	`shareWithStore` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_memos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`displayName` varchar(50),
	`nickname` varchar(50),
	`phone` varchar(20),
	`profileImageUrl` text,
	`totalSpent` int NOT NULL DEFAULT 0,
	`memberLevel` int NOT NULL DEFAULT 1,
	`memberPoints` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`targetType` enum('store','therapist') NOT NULL,
	`targetId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `favorites_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_favorites_unique` UNIQUE(`customerId`,`targetType`,`targetId`)
);
--> statement-breakpoint
CREATE TABLE `follows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`targetType` enum('store','therapist') NOT NULL,
	`targetId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `follows_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_follows_unique` UNIQUE(`customerId`,`targetType`,`targetId`)
);
--> statement-breakpoint
CREATE TABLE `identity_verifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role` enum('store','therapist') NOT NULL,
	`accountId` int NOT NULL,
	`documentType` varchar(50),
	`documentImageUrl` text,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`adminNote` text,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	CONSTRAINT `identity_verifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `menu_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`price` int NOT NULL,
	`isPublic` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `menu_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `menus` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`durationMinutes` int NOT NULL,
	`price` int NOT NULL,
	`nominationFee` int NOT NULL DEFAULT 0,
	`isPublic` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `menus_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `message_threads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`threadType` enum('store_customer','therapist_customer','store_therapist') NOT NULL,
	`storeId` int,
	`therapistId` int,
	`customerId` int,
	`reservationId` int,
	`lastMessageAt` timestamp NOT NULL DEFAULT (now()),
	`storeUnread` int NOT NULL DEFAULT 0,
	`therapistUnread` int NOT NULL DEFAULT 0,
	`customerUnread` int NOT NULL DEFAULT 0,
	`isBlocked` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `message_threads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`threadId` int NOT NULL,
	`senderRole` enum('store','therapist','customer') NOT NULL,
	`senderId` int NOT NULL,
	`content` text,
	`imageUrl` text,
	`isTemplate` boolean NOT NULL DEFAULT false,
	`isRead` boolean NOT NULL DEFAULT false,
	`isReported` boolean NOT NULL DEFAULT false,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ng_customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int,
	`therapistId` int,
	`customerId` int NOT NULL,
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ng_customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientRole` enum('store','therapist','customer') NOT NULL,
	`recipientId` int NOT NULL,
	`type` varchar(50) NOT NULL,
	`title` varchar(100) NOT NULL,
	`body` text,
	`relatedId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `post_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`imageUrl` text NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `post_images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`authorRole` enum('store','therapist') NOT NULL,
	`storeId` int,
	`therapistId` int,
	`postType` enum('normal','attendance','diary','campaign','news') NOT NULL DEFAULT 'normal',
	`content` text,
	`isPublic` boolean NOT NULL DEFAULT true,
	`scheduledAt` timestamp,
	`likeCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reporterRole` enum('store','therapist','customer') NOT NULL,
	`reporterId` int NOT NULL,
	`targetType` enum('store','therapist','customer','message','review','post') NOT NULL,
	`targetId` int NOT NULL,
	`reason` text NOT NULL,
	`status` enum('pending','reviewed','resolved','dismissed') NOT NULL DEFAULT 'pending',
	`adminNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reservation_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reservationId` int NOT NULL,
	`optionId` int NOT NULL,
	`price` int NOT NULL,
	CONSTRAINT `reservation_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`therapistId` int,
	`customerId` int NOT NULL,
	`menuId` int,
	`date` varchar(10) NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5) NOT NULL,
	`isNomination` boolean NOT NULL DEFAULT false,
	`status` enum('pending','confirmed','waiting','in_service','completed','cancelled','no_show','change_requested') NOT NULL DEFAULT 'pending',
	`totalPrice` int NOT NULL DEFAULT 0,
	`nominationFee` int NOT NULL DEFAULT 0,
	`optionTotal` int NOT NULL DEFAULT 0,
	`discountAmount` int NOT NULL DEFAULT 0,
	`couponId` int,
	`cancelReason` text,
	`cancelFee` int NOT NULL DEFAULT 0,
	`note` text,
	`customerNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reservations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reservationId` int NOT NULL,
	`customerId` int NOT NULL,
	`storeId` int,
	`therapistId` int,
	`rating` int NOT NULL,
	`comment` text,
	`storeReply` text,
	`isHidden` boolean NOT NULL DEFAULT false,
	`isReported` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reservationId` int NOT NULL,
	`storeId` int NOT NULL,
	`therapistId` int,
	`date` varchar(10) NOT NULL,
	`menuAmount` int NOT NULL DEFAULT 0,
	`nominationFee` int NOT NULL DEFAULT 0,
	`optionAmount` int NOT NULL DEFAULT 0,
	`discountAmount` int NOT NULL DEFAULT 0,
	`cancelFee` int NOT NULL DEFAULT 0,
	`totalAmount` int NOT NULL DEFAULT 0,
	`therapistBack` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sales_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shifts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`therapistId` int NOT NULL,
	`storeId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5) NOT NULL,
	`breakStart` varchar(5),
	`breakEnd` varchar(5),
	`status` enum('scheduled','working','off','holiday') NOT NULL DEFAULT 'scheduled',
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shifts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `store_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`crashPasswordHash` varchar(255),
	`twoFactorSecret` varchar(64),
	`twoFactorEnabled` boolean NOT NULL DEFAULT false,
	`identityVerified` boolean NOT NULL DEFAULT false,
	`identityVerifiedAt` timestamp,
	`status` enum('active','suspended','deleted') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `store_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `store_accounts_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `stores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`address` varchar(255),
	`prefecture` varchar(20),
	`city` varchar(50),
	`phone` varchar(20),
	`access` text,
	`openHours` varchar(100),
	`closeHours` varchar(100),
	`regularHoliday` varchar(100),
	`coverImageUrl` text,
	`logoUrl` text,
	`termsOfService` text,
	`cautionNote` text,
	`isPublic` boolean NOT NULL DEFAULT true,
	`followerCount` int NOT NULL DEFAULT 0,
	`reviewAvg` decimal(3,2) DEFAULT '0.00',
	`reviewCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `therapist_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`crashPasswordHash` varchar(255),
	`twoFactorSecret` varchar(64),
	`twoFactorEnabled` boolean NOT NULL DEFAULT false,
	`identityVerified` boolean NOT NULL DEFAULT false,
	`identityVerifiedAt` timestamp,
	`ageVerified` boolean NOT NULL DEFAULT false,
	`status` enum('active','suspended','deleted') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `therapist_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `therapist_accounts_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `therapist_payrolls` (
	`id` int AUTO_INCREMENT NOT NULL,
	`therapistId` int NOT NULL,
	`storeId` int NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`nominationCount` int NOT NULL DEFAULT 0,
	`totalSales` int NOT NULL DEFAULT 0,
	`backRate` decimal(5,2) DEFAULT '50.00',
	`backAmount` int NOT NULL DEFAULT 0,
	`optionAmount` int NOT NULL DEFAULT 0,
	`adjustmentAmount` int NOT NULL DEFAULT 0,
	`adjustmentNote` text,
	`totalPayroll` int NOT NULL DEFAULT 0,
	`isPaid` boolean NOT NULL DEFAULT false,
	`paidAt` timestamp,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `therapist_payrolls_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `therapists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`storeId` int,
	`displayName` varchar(50) NOT NULL,
	`age` int,
	`height` int,
	`bio` text,
	`specialties` text,
	`profileImageUrl` text,
	`coverImageUrl` text,
	`isPublic` boolean NOT NULL DEFAULT true,
	`affiliationStatus` enum('pending','approved','rejected','left') DEFAULT 'pending',
	`followerCount` int NOT NULL DEFAULT 0,
	`nominationCount` int NOT NULL DEFAULT 0,
	`reviewAvg` decimal(3,2) DEFAULT '0.00',
	`reviewCount` int NOT NULL DEFAULT 0,
	`backRate` decimal(5,2) DEFAULT '50.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `therapists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `age_verifications` ADD CONSTRAINT `age_verifications_customerId_customer_accounts_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customer_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupons` ADD CONSTRAINT `coupons_storeId_stores_id_fk` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_memos` ADD CONSTRAINT `customer_memos_therapistId_therapists_id_fk` FOREIGN KEY (`therapistId`) REFERENCES `therapists`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_memos` ADD CONSTRAINT `customer_memos_customerId_customer_accounts_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customer_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_profiles` ADD CONSTRAINT `customer_profiles_accountId_customer_accounts_id_fk` FOREIGN KEY (`accountId`) REFERENCES `customer_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_customerId_customer_accounts_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customer_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `follows` ADD CONSTRAINT `follows_customerId_customer_accounts_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customer_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `menu_options` ADD CONSTRAINT `menu_options_storeId_stores_id_fk` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `menus` ADD CONSTRAINT `menus_storeId_stores_id_fk` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message_threads` ADD CONSTRAINT `message_threads_storeId_stores_id_fk` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message_threads` ADD CONSTRAINT `message_threads_therapistId_therapists_id_fk` FOREIGN KEY (`therapistId`) REFERENCES `therapists`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message_threads` ADD CONSTRAINT `message_threads_customerId_customer_accounts_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customer_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message_threads` ADD CONSTRAINT `message_threads_reservationId_reservations_id_fk` FOREIGN KEY (`reservationId`) REFERENCES `reservations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_threadId_message_threads_id_fk` FOREIGN KEY (`threadId`) REFERENCES `message_threads`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ng_customers` ADD CONSTRAINT `ng_customers_storeId_stores_id_fk` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ng_customers` ADD CONSTRAINT `ng_customers_therapistId_therapists_id_fk` FOREIGN KEY (`therapistId`) REFERENCES `therapists`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ng_customers` ADD CONSTRAINT `ng_customers_customerId_customer_accounts_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customer_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `post_images` ADD CONSTRAINT `post_images_postId_posts_id_fk` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `posts` ADD CONSTRAINT `posts_storeId_stores_id_fk` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `posts` ADD CONSTRAINT `posts_therapistId_therapists_id_fk` FOREIGN KEY (`therapistId`) REFERENCES `therapists`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reservation_options` ADD CONSTRAINT `reservation_options_reservationId_reservations_id_fk` FOREIGN KEY (`reservationId`) REFERENCES `reservations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reservation_options` ADD CONSTRAINT `reservation_options_optionId_menu_options_id_fk` FOREIGN KEY (`optionId`) REFERENCES `menu_options`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_storeId_stores_id_fk` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_therapistId_therapists_id_fk` FOREIGN KEY (`therapistId`) REFERENCES `therapists`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_customerId_customer_accounts_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customer_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_menuId_menus_id_fk` FOREIGN KEY (`menuId`) REFERENCES `menus`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_couponId_coupons_id_fk` FOREIGN KEY (`couponId`) REFERENCES `coupons`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_reservationId_reservations_id_fk` FOREIGN KEY (`reservationId`) REFERENCES `reservations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_customerId_customer_accounts_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customer_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_storeId_stores_id_fk` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_therapistId_therapists_id_fk` FOREIGN KEY (`therapistId`) REFERENCES `therapists`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales` ADD CONSTRAINT `sales_reservationId_reservations_id_fk` FOREIGN KEY (`reservationId`) REFERENCES `reservations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales` ADD CONSTRAINT `sales_storeId_stores_id_fk` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales` ADD CONSTRAINT `sales_therapistId_therapists_id_fk` FOREIGN KEY (`therapistId`) REFERENCES `therapists`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shifts` ADD CONSTRAINT `shifts_therapistId_therapists_id_fk` FOREIGN KEY (`therapistId`) REFERENCES `therapists`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shifts` ADD CONSTRAINT `shifts_storeId_stores_id_fk` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stores` ADD CONSTRAINT `stores_accountId_store_accounts_id_fk` FOREIGN KEY (`accountId`) REFERENCES `store_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `therapist_payrolls` ADD CONSTRAINT `therapist_payrolls_therapistId_therapists_id_fk` FOREIGN KEY (`therapistId`) REFERENCES `therapists`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `therapist_payrolls` ADD CONSTRAINT `therapist_payrolls_storeId_stores_id_fk` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `therapists` ADD CONSTRAINT `therapists_accountId_therapist_accounts_id_fk` FOREIGN KEY (`accountId`) REFERENCES `therapist_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `therapists` ADD CONSTRAINT `therapists_storeId_stores_id_fk` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_audit_logs_actor` ON `audit_logs` (`actorRole`,`actorId`);--> statement-breakpoint
CREATE INDEX `idx_messages_thread` ON `messages` (`threadId`);--> statement-breakpoint
CREATE INDEX `idx_notifications_recipient` ON `notifications` (`recipientRole`,`recipientId`);--> statement-breakpoint
CREATE INDEX `idx_reservations_store_date` ON `reservations` (`storeId`,`date`);--> statement-breakpoint
CREATE INDEX `idx_reservations_therapist_date` ON `reservations` (`therapistId`,`date`);--> statement-breakpoint
CREATE INDEX `idx_reservations_customer` ON `reservations` (`customerId`);--> statement-breakpoint
CREATE INDEX `idx_shifts_therapist_date` ON `shifts` (`therapistId`,`date`);