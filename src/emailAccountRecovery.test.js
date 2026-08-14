import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server = readFileSync(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8');
const schema = readFileSync(new URL('../db/schema.js', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../drizzle/0010_email_password_reset.sql', import.meta.url), 'utf8');
const page = readFileSync(new URL('./AccountRecoveryPage.jsx', import.meta.url), 'utf8');

test('재설정 토큰은 원문 대신 해시·만료·사용 상태로 D1에 저장한다', () => {
  for (const source of [schema, migration]) {
    assert.match(source, /CREATE TABLE IF NOT EXISTS account_password_resets/);
    assert.match(source, /token_hash TEXT NOT NULL UNIQUE/);
    assert.match(source, /expires_at TEXT NOT NULL/);
    assert.match(source, /used_at TEXT/);
  }
  assert.match(server, /const tokenHash = await authSha256Hex\(rawToken\)/);
  assert.match(server, /30 \* 60 \* 1000/);
  assert.doesNotMatch(server, /INSERT INTO account_password_resets[^\n]*rawToken/);
});

test('비밀번호 재설정은 유효한 일회성 링크만 허용하고 기존 세션을 종료한다', () => {
  assert.match(server, /r\.used_at IS NULL AND r\.expires_at>CURRENT_TIMESTAMP/);
  assert.match(server, /UPDATE auth_credentials SET password_hash=\?, password_salt=\?/);
  assert.match(server, /UPDATE account_password_resets SET used_at=CURRENT_TIMESTAMP/);
  assert.match(server, /DELETE FROM auth_sessions WHERE account_id=\?/);
  assert.match(page, /action: 'reset_password'/);
  assert.match(page, /window\.history\.replaceState/);
  assert.doesNotMatch(server, /resetUrl\.searchParams\.set\('email'/);
});

test('계정 찾기 응답은 계정 존재와 내부 접수번호를 공개하지 않는다', () => {
  assert.match(server, /계정 존재 여부, 실제 발송 여부와 대상 이메일은 공개 응답으로 노출하지 않는다/);
  assert.match(server, /return json\(\{ accepted:true, emailDeliveryAvailable \}, 202\)/);
  assert.doesNotMatch(server, /return json\(\{ accepted:true, requestId/);
  assert.doesNotMatch(page, /requestId/);
  assert.match(page, /입력한 이메일과 일치하는 계정이 있으면/);
});

test('이메일 발송은 Resend 환경설정을 요구하고 30분 일회용 링크를 안내한다', () => {
  assert.match(server, /env\.RESEND_API_KEY && env\.RESEND_FROM/);
  assert.match(server, /https:\/\/api\.resend\.com\/emails/);
  assert.match(server, /30분 동안 한 번만 사용할 수 있습니다/);
  assert.match(server, /ctx\.waitUntil\(deliveryTask\)/);
  assert.match(page, /현재 이메일 발송 설정이 준비되지 않아/);
});
