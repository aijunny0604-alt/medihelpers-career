CREATE TABLE IF NOT EXISTS member_profiles (
  account_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  organization TEXT NOT NULL DEFAULT '',
  job_title TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS member_preferences (
  account_id TEXT PRIMARY KEY,
  email_notifications INTEGER NOT NULL DEFAULT 1,
  sms_notifications INTEGER NOT NULL DEFAULT 1,
  service_notifications INTEGER NOT NULL DEFAULT 1,
  marketing_notifications INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS member_activity (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS member_activity_account_idx ON member_activity(account_id, occurred_at DESC);
