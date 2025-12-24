-- CreateLineOALinkAndNotificationTables
-- Migration for LINE OA Integration

-- Create LineOALink table
CREATE TABLE IF NOT EXISTS `LineOALink` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL,
  `lineUserId` VARCHAR(191) NOT NULL UNIQUE,
  `displayName` VARCHAR(191),
  `pictureUrl` VARCHAR(500),
  `status` ENUM('PENDING', 'VERIFIED', 'UNLINKED') NOT NULL DEFAULT 'PENDING',
  `verificationToken` VARCHAR(191),
  `verificationExpiry` DATETIME(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `userId` (`userId`),
  CONSTRAINT `LineOALink_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE
);

-- Create LineNotification table
CREATE TABLE IF NOT EXISTS `LineNotification` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `lineUserId` VARCHAR(191) NOT NULL,
  `type` VARCHAR(191) NOT NULL,
  `title` VARCHAR(500) NOT NULL,
  `message` LONGTEXT NOT NULL,
  `status` ENUM('SENT', 'FAILED', 'READ') NOT NULL DEFAULT 'SENT',
  `retryCount` INT NOT NULL DEFAULT 0,
  `errorMessage` LONGTEXT,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `lineUserId_idx` (`lineUserId`),
  INDEX `status_idx` (`status`)
);

-- Create index for querying failed notifications
CREATE INDEX `lineNotification_status_retryCount_idx` ON `LineNotification`(`status`, `retryCount`);
