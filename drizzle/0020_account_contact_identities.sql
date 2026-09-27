-- Migrated accounts keep an opaque, unique credential principal, while contact
-- emails may be shared. No accounts or credentials are activated by this DDL.
CREATE TABLE IF NOT EXISTS account_contact_identities (
  account_id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source='rankup'),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES auth_credentials(account_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS account_contact_email_idx ON account_contact_identities(email);
