-- 신규 아이디와 이전 아이디는 하나의 이름 공간을 공유한다.
-- 기존 rankup 별칭/비밀번호/상태는 변경하지 않는다.
CREATE TABLE IF NOT EXISTS auth_usernames (
  login_id TEXT PRIMARY KEY COLLATE BINARY,
  account_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES auth_credentials(account_id) ON DELETE CASCADE
);
CREATE TRIGGER IF NOT EXISTS native_login_reserves_legacy BEFORE INSERT ON auth_usernames
WHEN EXISTS (SELECT 1 FROM auth_login_aliases WHERE login_id=NEW.login_id)
BEGIN SELECT RAISE(ABORT,'LOGIN_ID_RESERVED'); END;
CREATE TRIGGER IF NOT EXISTS legacy_login_reserves_native BEFORE INSERT ON auth_login_aliases
WHEN EXISTS (SELECT 1 FROM auth_usernames WHERE login_id=NEW.login_id)
BEGIN SELECT RAISE(ABORT,'LOGIN_ID_RESERVED'); END;
