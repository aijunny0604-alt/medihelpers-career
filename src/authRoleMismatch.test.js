import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('logged-in members with the wrong role see a standalone notice without another login prompt', async () => {
  const source = await readFile(new URL('./main.jsx', import.meta.url), 'utf8');
  const authGateStart = source.indexOf('function AuthGate');
  const mismatchStart = source.indexOf("if (auth.status === 'member')", authGateStart);
  const guestStart = source.indexOf('return <div className="auth-gate-wrap">', mismatchStart);
  const mismatchBranch = source.slice(mismatchStart, guestStart);

  assert.ok(authGateStart >= 0 && mismatchStart > authGateStart && guestStart > mismatchStart);
  assert.match(mismatchBranch, /auth-role-mismatch/);
  assert.match(mismatchBranch, /현재 병원회원으로 로그인되어 있습니다/);
  assert.match(mismatchBranch, /현재 의료인회원으로 로그인되어 있습니다/);
  assert.doesNotMatch(mismatchBranch, /<Link/);
  assert.doesNotMatch(mismatchBranch, /로그인<\/Link>/);
  assert.doesNotMatch(mismatchBranch, /\{children\}/);
});

test('anonymous visitors keep the protected-content preview and login path', async () => {
  const source = await readFile(new URL('./main.jsx', import.meta.url), 'utf8');
  const authGateStart = source.indexOf('function AuthGate');
  const authGateEnd = source.indexOf('function Link', authGateStart);
  const authGate = source.slice(authGateStart, authGateEnd);

  assert.match(authGate, /auth-gate-blurred/);
  assert.match(authGate, /to=\{`\/login\?next=/);
  assert.match(authGate, /> 로그인<\/Link>/);
});
