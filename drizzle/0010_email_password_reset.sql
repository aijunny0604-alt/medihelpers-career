CREATE TABLE IF NOT EXISTS account_password_resets (
  id TEXT PRIMARY KEY,
  recovery_request_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  email_normalized TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (delivery_status IN ('pending','sent','failed','not_configured')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recovery_request_id) REFERENCES account_recovery_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS account_password_resets_account_idx
ON account_password_resets(account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS account_password_resets_expiry_idx
ON account_password_resets(expires_at, used_at);

PRAGMA optimize;
