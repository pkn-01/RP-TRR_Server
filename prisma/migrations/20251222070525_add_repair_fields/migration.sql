-- AlterTable
ALTER TABLE `ticket` ADD COLUMN `equipmentId` VARCHAR(191) NULL,
    ADD COLUMN `notes` LONGTEXT NULL,
    ADD COLUMN `requiredDate` VARCHAR(191) NULL;
