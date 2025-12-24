/*
  Warnings:

  - Added the required column `equipmentName` to the `Ticket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `location` to the `Ticket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `problemCategory` to the `Ticket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `problemSubcategory` to the `Ticket` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ticket` ADD COLUMN `equipmentName` VARCHAR(191) NOT NULL,
    ADD COLUMN `location` VARCHAR(191) NOT NULL,
    ADD COLUMN `problemCategory` ENUM('NETWORK', 'HARDWARE', 'SOFTWARE', 'PRINTER', 'AIR_CONDITIONING', 'ELECTRICITY', 'OTHER') NOT NULL,
    ADD COLUMN `problemSubcategory` ENUM('INTERNET_DOWN', 'SLOW_CONNECTION', 'WIFI_ISSUE', 'MONITOR_BROKEN', 'KEYBOARD_BROKEN', 'MOUSE_BROKEN', 'COMPUTER_CRASH', 'INSTALLATION', 'LICENSE', 'PERFORMANCE', 'JAM', 'NO_PRINTING', 'CARTRIDGE', 'INSTALLATION_AC', 'MALFUNCTION_AC', 'POWER_DOWN', 'LIGHT_PROBLEM', 'OTHER') NOT NULL;

-- CreateTable
CREATE TABLE `Attachment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ticketId` INTEGER NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(191) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `Ticket`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
