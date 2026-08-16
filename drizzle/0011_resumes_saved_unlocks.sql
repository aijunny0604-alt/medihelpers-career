-- 이력서·관심공고·인재 열람권·계정 복구 스키마.
-- 이 테이블들의 마이그레이션이 저장소에 없어서, D1을 처음부터 만드는 환경(로컬 실행 등)에서는
-- 이력서 등록·구직글 노출·관심공고(찜)·열람권 구매가 500으로 실패했다.
-- 기존 배포본에는 이미 테이블이 있으므로 IF NOT EXISTS 로 안전하게 재적용된다.

-- 의료인 이력서(= 구직 등록). visibility='public'이면 익명 인재로 구직 게시판에 노출된다.
CREATE TABLE IF NOT EXISTS resumes (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  profession TEXT NOT NULL DEFAULT '',
  specialty TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  desired_regions TEXT NOT NULL DEFAULT '',
  completion INTEGER NOT NULL DEFAULT 0,
  visibility TEXT NOT NULL DEFAULT 'private',
  status TEXT NOT NULL DEFAULT 'draft',
  detail_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_resumes_account ON resumes (account_id);
CREATE INDEX IF NOT EXISTS idx_resumes_visibility ON resumes (visibility, updated_at DESC);

-- 관심공고(찜). 기기 간 동기화를 위해 서버에 저장한다.
CREATE TABLE IF NOT EXISTS saved_jobs (
  account_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'job',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (account_id, job_id, kind)
);

CREATE INDEX IF NOT EXISTS idx_saved_jobs_account ON saved_jobs (account_id, kind);

-- 병원이 결제한 인재 이력서 열람권(단건). 만료 시각까지 해당 인재 상세를 열람할 수 있다.
CREATE TABLE IF NOT EXISTS talent_unlocks (
  id TEXT PRIMARY KEY,
  hospital_account_id TEXT NOT NULL,
  talent_id TEXT NOT NULL,
  order_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_talent_unlocks_hospital ON talent_unlocks (hospital_account_id, talent_id);
CREATE INDEX IF NOT EXISTS idx_talent_unlocks_order ON talent_unlocks (order_id);

-- 아이디·비밀번호 찾기 요청 접수 기록.
CREATE TABLE IF NOT EXISTS account_recovery_requests (
  id TEXT PRIMARY KEY,
  request_type TEXT NOT NULL,
  requester_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email_normalized TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recovery_email ON account_recovery_requests (email_normalized);
