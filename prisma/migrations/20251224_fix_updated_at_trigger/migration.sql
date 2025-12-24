-- Ensure updatedAt trigger exists for loan table
-- This migration ensures that the updatedAt column is automatically updated when a loan record is modified

-- If using MySQL 5.7+, ensure the trigger exists
DROP TRIGGER IF EXISTS `loan_updated_at_trigger`;

CREATE TRIGGER `loan_updated_at_trigger`
BEFORE UPDATE ON `loan`
FOR EACH ROW
SET NEW.`updatedAt` = CURRENT_TIMESTAMP;
