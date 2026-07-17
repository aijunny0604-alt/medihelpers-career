CREATE TABLE IF NOT EXISTS consultation_requests (
  id TEXT PRIMARY KEY,
  request_type TEXT NOT NULL CHECK (request_type IN ('doctor', 'hospital')),
  requester_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  specialty TEXT,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'in_progress', 'closed')),
  admin_note TEXT NOT NULL DEFAULT '',
  email_notification_status TEXT NOT NULL DEFAULT 'pending',
  sms_notification_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS consultation_requests_created_idx ON consultation_requests(created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS consultation_requests_status_idx ON consultation_requests(status, created_at DESC);
