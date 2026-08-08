CREATE TABLE IF NOT EXISTS inquiry_messages (
  id TEXT PRIMARY KEY,
  consultation_id TEXT NOT NULL,
  sender_account_id TEXT NOT NULL,
  recipient_account_id TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('doctor','hospital')),
  sender_name TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (consultation_id) REFERENCES consultation_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS inquiry_messages_consultation_idx
ON inquiry_messages(consultation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS inquiry_messages_sender_idx
ON inquiry_messages(sender_account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS inquiry_messages_recipient_idx
ON inquiry_messages(recipient_account_id, created_at DESC);

PRAGMA optimize;
