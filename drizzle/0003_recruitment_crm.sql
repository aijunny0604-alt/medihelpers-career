CREATE TABLE IF NOT EXISTS recruitment_cases (
  id TEXT PRIMARY KEY, consultation_id TEXT, hospital_name TEXT NOT NULL,
  specialty TEXT NOT NULL DEFAULT '', position_title TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL DEFAULT 'new_request', assigned_recruiter TEXT NOT NULL DEFAULT '',
  success_fee_terms TEXT NOT NULL DEFAULT '', estimated_fee INTEGER NOT NULL DEFAULT 0,
  next_action TEXT NOT NULL DEFAULT '', billing_status TEXT NOT NULL DEFAULT 'success_fee',
  hired_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (consultation_id) REFERENCES consultation_requests(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS candidate_submissions (
  id TEXT PRIMARY KEY, case_id TEXT NOT NULL, candidate_public_id TEXT NOT NULL,
  candidate_private_ref TEXT NOT NULL DEFAULT '', consent_status TEXT NOT NULL DEFAULT 'pending',
  submission_status TEXT NOT NULL DEFAULT 'identified', proposed_terms_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES recruitment_cases(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS interview_events (
  id TEXT PRIMARY KEY, case_id TEXT NOT NULL, submission_id TEXT, scheduled_at TEXT,
  status TEXT NOT NULL DEFAULT 'planned', notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES recruitment_cases(id) ON DELETE CASCADE,
  FOREIGN KEY (submission_id) REFERENCES candidate_submissions(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS consent_grants (
  id TEXT PRIMARY KEY, candidate_private_ref TEXT NOT NULL, case_id TEXT NOT NULL,
  hospital_name TEXT NOT NULL, scope_json TEXT NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'granted',
  granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, revoked_at TEXT,
  FOREIGN KEY (case_id) REFERENCES recruitment_cases(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS billing_records (
  id TEXT PRIMARY KEY, case_id TEXT NOT NULL, billing_type TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'pending', due_at TEXT, paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES recruitment_cases(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS access_audit_logs (
  id TEXT PRIMARY KEY, actor_key TEXT NOT NULL, action TEXT NOT NULL,
  subject_ref TEXT NOT NULL DEFAULT '', case_id TEXT, metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES recruitment_cases(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS recruitment_cases_stage_idx ON recruitment_cases(stage, updated_at DESC);
CREATE INDEX IF NOT EXISTS candidate_submissions_case_idx ON candidate_submissions(case_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS consent_grants_case_idx ON consent_grants(case_id, status);
CREATE INDEX IF NOT EXISTS billing_records_case_idx ON billing_records(case_id, status);
CREATE INDEX IF NOT EXISTS access_audit_logs_case_idx ON access_audit_logs(case_id, created_at DESC);
