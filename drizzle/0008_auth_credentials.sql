-- 자체 로그인(이메일+비밀번호) 인증 스키마.
-- 이 파일이 저장소에 없어서 새 환경(로컬 Cloudflare 실행 등)에서 D1을 처음부터 만들면
-- auth_credentials/auth_sessions 가 없어 로그인·테스트 계정 전환이 503으로 실패했다.
-- 기존 배포본에는 이미 테이블이 있으므로 IF NOT EXISTS 로 안전하게 재적용된다.

CREATE TABLE IF NOT EXISTS auth_credentials (
  account_id TEXT PRIMARY KEY,
  email_normalized TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL DEFAULT 100000,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_credentials_email ON auth_credentials (email_normalized);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_account ON auth_sessions (account_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions (expires_at);

-- 탈퇴 후 재가입 30일 제한에 쓰는 해시 기록(개인정보 아님).
CREATE TABLE IF NOT EXISTS withdrawn_members (
  user_key TEXT PRIMARY KEY,
  withdrawn_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
