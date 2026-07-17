CREATE TABLE IF NOT EXISTS account_admin_profiles (
  account_id TEXT PRIMARY KEY,
  email TEXT NOT NULL DEFAULT '',
  full_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','withdrawn')),
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','pending','verified','rejected')),
  joined_from TEXT NOT NULL DEFAULT 'sites',
  last_login_at TEXT,
  admin_note TEXT NOT NULL DEFAULT '',
  updated_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payment_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  account_id TEXT NOT NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('doctor_ad','membership','medical_staff_ad','headhunting')),
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KRW',
  supply_amount INTEGER NOT NULL DEFAULT 0,
  tax_amount INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review','awaiting_payment','paid','failed','cancelled','partially_refunded','refunded')),
  payment_method TEXT NOT NULL DEFAULT '',
  customer_name TEXT NOT NULL DEFAULT '',
  customer_email TEXT NOT NULL DEFAULT '',
  customer_phone TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  admin_note TEXT NOT NULL DEFAULT '',
  paid_at TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('authorization','capture','failure','cancellation','refund')),
  provider TEXT NOT NULL DEFAULT 'manual',
  provider_transaction_id TEXT NOT NULL DEFAULT '',
  amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('pending','succeeded','failed','cancelled')),
  failure_code TEXT NOT NULL DEFAULT '',
  failure_message TEXT NOT NULL DEFAULT '',
  processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES payment_orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payment_refunds (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  transaction_id TEXT,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','processing','succeeded','failed','cancelled')),
  requested_by TEXT NOT NULL DEFAULT '',
  provider_refund_id TEXT NOT NULL DEFAULT '',
  processed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES payment_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (transaction_id) REFERENCES payment_transactions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payment_receipts (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  receipt_number TEXT NOT NULL UNIQUE,
  supply_amount INTEGER NOT NULL,
  tax_amount INTEGER NOT NULL,
  total_amount INTEGER NOT NULL,
  receipt_type TEXT NOT NULL DEFAULT 'payment_receipt' CHECK (receipt_type IN ('payment_receipt','tax_invoice','cash_receipt')),
  issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelled_at TEXT,
  FOREIGN KEY (order_id) REFERENCES payment_orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payment_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  actor_key TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL,
  from_status TEXT NOT NULL DEFAULT '',
  to_status TEXT NOT NULL DEFAULT '',
  detail_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES payment_orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  order_number TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL,
  signature_verified INTEGER NOT NULL DEFAULT 0,
  payload_hash TEXT NOT NULL DEFAULT '',
  processing_status TEXT NOT NULL DEFAULT 'received' CHECK (processing_status IN ('received','processed','ignored','failed')),
  error_message TEXT NOT NULL DEFAULT '',
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TEXT,
  UNIQUE(provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS account_admin_profiles_status_idx ON account_admin_profiles(status, verification_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS payment_orders_account_idx ON payment_orders(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_orders_status_idx ON payment_orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_transactions_order_idx ON payment_transactions(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_refunds_order_idx ON payment_refunds(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_events_order_idx ON payment_events(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_webhook_order_idx ON payment_webhook_events(order_number, received_at DESC);
