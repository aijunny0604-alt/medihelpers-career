CREATE TABLE IF NOT EXISTS upload_objects (
  object_key TEXT PRIMARY KEY,
  size INTEGER NOT NULL CHECK(size BETWEEN 1 AND 10485760),
  sha256 TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS upload_chunks (
  object_key TEXT NOT NULL REFERENCES upload_objects(object_key) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL CHECK(chunk_index >= 0),
  body BLOB NOT NULL CHECK(length(body) BETWEEN 1 AND 1048576),
  PRIMARY KEY(object_key,chunk_index)
);
-- Reserve ample room in the free 500MB database for member/payment records.
DROP TRIGGER IF EXISTS upload_quota;
CREATE TRIGGER IF NOT EXISTS upload_quota BEFORE INSERT ON upload_objects
WHEN (SELECT COALESCE(SUM(size),0) FROM upload_objects)+NEW.size > 104857600
  OR (SELECT COUNT(*) FROM upload_objects) >= 5000
BEGIN SELECT RAISE(ABORT,'UPLOAD_QUOTA_EXCEEDED'); END;
