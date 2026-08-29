import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('members with the wrong role see a standalone notice with back and home only', async () => {
  const source = await readFile(new URL('./main.jsx', import.meta.url), 'utf8');
  const authGateStart = source.indexOf('function AuthGate');
  const mismatchStart = source.indexOf("if (auth.status === 'member')", authGateStart);
  const guestStart = source.indexOf('return <section className="auth-gate auth-access-notice">', mismatchStart);
  const mismatchBranch = source.slice(mismatchStart, guestStart);

  assert.ok(authGateStart >= 0 && mismatchStart > authGateStart && guestStart > mismatchStart);
  assert.match(mismatchBranch, /auth-role-mismatch/);
  assert.match(mismatchBranch, /현재 병원회원으로 로그인되어 있습니다/);
  assert.match(mismatchBranch, /현재 의료인회원으로 로그인되어 있습니다/);
  assert.match(mismatchBranch, /AccessNoticeActions/);
  assert.doesNotMatch(mismatchBranch, /\/login/);
  assert.doesNotMatch(mismatchBranch, /\/signup/);
  assert.doesNotMatch(mismatchBranch, /\{children\}/);
});

test('anonymous visitors see only the access notice with back and home navigation', async () => {
  const source = await readFile(new URL('./main.jsx', import.meta.url), 'utf8');
  const authGateStart = source.indexOf('function AuthGate');
  const authGateEnd = source.indexOf('function Link', authGateStart);
  const authGate = source.slice(authGateStart, authGateEnd);

  assert.match(authGate, /auth-access-notice/);
  assert.match(authGate, /AccessNoticeActions/);
  assert.doesNotMatch(authGate, /auth-gate-blurred/);
  assert.doesNotMatch(authGate, /`\/login\?next=/);
  assert.doesNotMatch(authGate, /`\/signup/);
});

test('access notices provide safe back fallback and home navigation', async () => {
  const source = await readFile(new URL('./main.jsx', import.meta.url), 'utf8');
  const navigation = source.slice(source.indexOf('function returnFromAccessNotice'), source.indexOf('function useRoute'));
  assert.match(navigation, /window\.history\.back\(\)/);
  assert.match(navigation, /navigate\(fallback\)/);
  assert.match(navigation, /> 뒤로가기<\/button>/);
  assert.match(navigation, /to="\/">홈으로<\/Link>/);
});
