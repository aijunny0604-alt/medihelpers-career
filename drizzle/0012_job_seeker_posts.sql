CREATE TABLE IF NOT EXISTS job_seeker_posts (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  resume_id TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  specialty TEXT NOT NULL DEFAULT '',
  desired_region TEXT NOT NULL DEFAULT '',
  available_from TEXT NOT NULL DEFAULT '',
  employment_type TEXT NOT NULL DEFAULT '',
  contact_visibility TEXT NOT NULL DEFAULT 'private' CHECK (contact_visibility IN ('ticket','private')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed','deleted')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS job_seeker_posts_account_idx
ON job_seeker_posts(account_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS job_seeker_posts_public_idx
ON job_seeker_posts(status, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS job_seeker_posts_active_resume_idx
ON job_seeker_posts(account_id, resume_id)
WHERE status = 'active';

INSERT OR IGNORE INTO job_seeker_posts (
  id, account_id, resume_id, title, summary, specialty, desired_region,
  available_from, employment_type, contact_visibility, status, created_at, updated_at
)
SELECT
  'JSP-' || id, account_id, id, COALESCE(NULLIF(title,''),'구직 중인 의료인'), '',
  specialty, desired_regions,
  COALESCE(NULLIF(json_extract(detail_json,'$.available'),''),'협의'),
  COALESCE(NULLIF(json_extract(detail_json,'$.workTypes'),''),''),
  CASE WHEN json_extract(detail_json,'$.contactVisibility')='ticket' THEN 'ticket' ELSE 'private' END,
  'active', created_at, updated_at
FROM resumes
WHERE visibility='public';
