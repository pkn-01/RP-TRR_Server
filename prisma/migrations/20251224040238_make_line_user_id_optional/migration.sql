/*
  Warnings:

  - You are about to alter the column `title` on the `linenotification` table. The data in that column could be lost. The data in that column will be cast from `VarChar(500)` to `VarChar(191)`.
  - You are about to alter the column `pictureUrl` on the `lineoalink` table. The data in that column could be lost. The data in that column will be cast from `VarChar(500)` to `VarChar(191)`.

*/
-- DropForeignKey
ALTER TABLE `lineoalink` DROP FOREIGN KEY `LineOALink_userId_fkey`;

-- DropIndex
DROP INDEX `lineNotification_status_retryCount_idx` ON `linenotification`;

-- DropIndex
DROP INDEX `lineUserId_idx` ON `linenotification`;

-- DropIndex
DROP INDEX `status_idx` ON `linenotification`;

-- DropIndex
DROP INDEX `lineUserId` ON `lineoalink`;

-- AlterTable
ALTER TABLE `linenotification` MODIFY `title` VARCHAR(191) NOT NULL,
    MODIFY `message` VARCHAR(191) NOT NULL,
    MODIFY `errorMessage` VARCHAR(191) NULL,
    ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `lineoalink` MODIFY `lineUserId` VARCHAR(191) NULL,
    MODIFY `pictureUrl` VARCHAR(191) NULL,
    ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AddForeignKey
ALTER TABLE `LineOALink` ADD CONSTRAINT `LineOALink_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `lineoalink` RENAME INDEX `userId` TO `LineOALink_userId_key`;
