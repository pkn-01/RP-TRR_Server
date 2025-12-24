-- CreateTable Loan
CREATE TABLE `Loan` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `itemName` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191),
    `quantity` INT NOT NULL DEFAULT 1,
    `borrowDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expectedReturnDate` DATETIME(3) NOT NULL,
    `returnDate` DATETIME(3),
    `status` ENUM('BORROWED', 'RETURNED', 'OVERDUE', 'LOST') NOT NULL DEFAULT 'BORROWED',
    `userId` INT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`),
    CONSTRAINT `Loan_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
