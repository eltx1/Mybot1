-- Admin access migration
-- 1) Adds users.is_admin if missing
-- 2) Creates helper procedure to safely elevate a user by email
-- 3) Includes rollback snippet

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER password_hash;

DELIMITER $$
CREATE PROCEDURE grant_admin_by_email(IN p_email VARCHAR(191))
BEGIN
  UPDATE users
  SET is_admin = 1
  WHERE LOWER(email) = LOWER(TRIM(p_email))
  LIMIT 1;
END $$
DELIMITER ;

-- Example usage:
-- CALL grant_admin_by_email('owner@example.com');

-- Verification:
-- SELECT id, name, email, is_admin, created_at
-- FROM users
-- WHERE LOWER(email) = LOWER('owner@example.com')
-- LIMIT 1;

-- Rollback (manual):
-- UPDATE users SET is_admin = 0 WHERE LOWER(email) = LOWER('owner@example.com');
