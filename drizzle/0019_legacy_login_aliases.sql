-- Import-only alias mapping. Public registration must never create or claim aliases.
CREATE TABLE IF NOT EXISTS auth_login_aliases (
  login_id TEXT PRIMARY KEY COLLATE BINARY,
  account_id TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL CHECK (source='rankup'),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES auth_credentials(account_id) ON DELETE CASCADE
);
