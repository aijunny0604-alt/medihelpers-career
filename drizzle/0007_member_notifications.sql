CREATE TABLE IF NOT EXISTS member_notifications (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'service',
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  action_url TEXT NOT NULL DEFAULT '/mypage?tab=notifications',
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS member_notifications_account_idx
ON member_notifications(account_id, read_at, created_at DESC);

PRAGMA optimize;
