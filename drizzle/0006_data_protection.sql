CREATE TABLE IF NOT EXISTS data_protection_runs (
  id TEXT PRIMARY KEY,
  run_type TEXT NOT NULL CHECK (run_type IN ('backup','retention')),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('daily','manual')),
  status TEXT NOT NULL CHECK (status IN ('running','succeeded','failed')),
  actor TEXT NOT NULL DEFAULT 'system',
  object_key TEXT NOT NULL DEFAULT '',
  checksum TEXT NOT NULL DEFAULT '',
  row_counts_json TEXT NOT NULL DEFAULT '{}',
  detail_json TEXT NOT NULL DEFAULT '{}',
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS data_protection_runs_created_idx
  ON data_protection_runs(started_at DESC);
