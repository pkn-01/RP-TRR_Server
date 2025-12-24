-- AlterTable
ALTER TABLE `loan` ADD COLUMN `borrowerDepartment` VARCHAR(191) NULL,
    ADD COLUMN `borrowerLineId` VARCHAR(191) NULL,
    ADD COLUMN `borrowerName` VARCHAR(191) NULL,
    ADD COLUMN `borrowerPhone` VARCHAR(191) NULL;
