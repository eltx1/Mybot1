-- حذف أعمدة/بيانات مزودي الدفع السابقين (Stripe/Cryptomus) إن وجدت
-- وإضافة بنية NOWPayments + سجلات الدفع.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(32) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_invoice_id VARCHAR(191) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(32) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_crypto_currency VARCHAR(32) DEFAULT NULL;

ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(32) DEFAULT NULL AFTER provider,
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(32) DEFAULT NULL AFTER status,
  ADD COLUMN IF NOT EXISTS payment_invoice_id VARCHAR(191) DEFAULT NULL AFTER provider_invoice_id,
  ADD COLUMN IF NOT EXISTS payment_crypto_currency VARCHAR(32) DEFAULT NULL AFTER currency;

-- توحيد provider الحالي إلى nowpayments إذا كنت تريد ذلك يدويًا
-- UPDATE user_subscriptions SET provider = 'nowpayments' WHERE provider IN ('stripe', 'cryptomus');

CREATE TABLE IF NOT EXISTS payment_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  provider VARCHAR(32) NOT NULL,
  event_type VARCHAR(120) NOT NULL,
  reference VARCHAR(128) DEFAULT NULL,
  transaction_id VARCHAR(191) DEFAULT NULL,
  invoice_id VARCHAR(191) DEFAULT NULL,
  status VARCHAR(64) DEFAULT NULL,
  error_message TEXT DEFAULT NULL,
  payload LONGTEXT DEFAULT NULL,
  headers_json LONGTEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_payment_reference (reference),
  INDEX idx_payment_provider (provider, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
