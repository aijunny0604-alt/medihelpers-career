import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { accountSchemaStatements } from '../db/schema.js';

test('자체 로그인 자격증명과 세션을 기존 계정에 연결한다', () => {
  const schema = accountSchemaStatements.join('\n');
  assert.match(schema, /CREATE TABLE IF NOT EXISTS auth_credentials/);
  assert.match(schema, /email_normalized TEXT NOT NULL UNIQUE/);
  assert.match(schema, /password_hash TEXT NOT NULL/);
  assert.match(schema, /FOREIGN KEY \(account_id\) REFERENCES accounts\(id\) ON DELETE CASCADE/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS auth_sessions/);
  assert.match(schema, /token_hash TEXT PRIMARY KEY/);
  assert.match(schema, /expires_at TEXT NOT NULL/);
});

test('배포 서버는 보안 쿠키와 PBKDF2를 사용하고 OpenAI 로그인 경로를 포함하지 않는다', async () => {
  const serverSource = await readFile(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8');
  const accountSource = await readFile(new URL('./AccountPage.jsx', import.meta.url), 'utf8');
  assert.match(serverSource, /HttpOnly; Secure; SameSite=Lax/);
  assert.match(serverSource, /name:'PBKDF2'/);
  assert.match(serverSource, /passwordIterations = 100000/);
  assert.doesNotMatch(serverSource + accountSource, /signin-with-chatgpt|signout-with-chatgpt|auth\.openai\.com/);
});
