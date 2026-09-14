ALTER TABLE job_seeker_posts ADD COLUMN public_until TEXT NOT NULL DEFAULT '';
ALTER TABLE job_seeker_posts ADD COLUMN hidden_reason TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS job_seeker_posts_expiry_idx ON job_seeker_posts(status, public_until);
