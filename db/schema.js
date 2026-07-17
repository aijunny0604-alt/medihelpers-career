export const accountSchemaStatements = [
  `CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    user_key TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('doctor', 'hospital')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS consent_records (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    consent_type TEXT NOT NULL CHECK (consent_type IN ('terms', 'age_confirmation', 'privacy_notice_ack')),
    document_version TEXT NOT NULL,
    accepted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    UNIQUE (account_id, consent_type, document_version)
  )`,
  `CREATE INDEX IF NOT EXISTS consent_records_account_idx ON consent_records(account_id)`
];

export const consultationSchemaStatements = [
  `CREATE TABLE IF NOT EXISTS consultation_requests (
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
  )`,
  `CREATE INDEX IF NOT EXISTS consultation_requests_created_idx ON consultation_requests(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS consultation_requests_status_idx ON consultation_requests(status, created_at DESC)`
];

export const memberCenterSchemaStatements = [
  `CREATE TABLE IF NOT EXISTS member_profiles (
    account_id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    organization TEXT NOT NULL DEFAULT '',
    job_title TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS member_preferences (
    account_id TEXT PRIMARY KEY,
    email_notifications INTEGER NOT NULL DEFAULT 1,
    sms_notifications INTEGER NOT NULL DEFAULT 1,
    service_notifications INTEGER NOT NULL DEFAULT 1,
    marketing_notifications INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS member_activity (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS member_activity_account_idx ON member_activity(account_id, occurred_at DESC)`
];
