CREATE TABLE IF NOT EXISTS processing_consent_events (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  scope TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  document_version TEXT NOT NULL,
  notice_json TEXT NOT NULL,
  accepted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS processing_consent_account_idx ON processing_consent_events(account_id, accepted_at);
