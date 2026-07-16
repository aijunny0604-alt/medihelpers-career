CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  user_key TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('doctor', 'hospital')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS consent_records (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('terms', 'age_confirmation', 'privacy_notice_ack')),
  document_version TEXT NOT NULL,
  accepted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  UNIQUE (account_id, consent_type, document_version)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS consent_records_account_idx ON consent_records(account_id);
