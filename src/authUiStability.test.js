import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('auth-sensitive pages reuse the single app account lookup', async () => {
  const source = await readFile(new URL('./main.jsx', import.meta.url), 'utf8');

  assert.equal((source.match(/useAuthGate\(/g) || []).length, 2);
  assert.match(source, /<JobsPage route=\{route\} qa=\{qa\} auth=\{auth\}/);
  assert.match(source, /<JobSeekerBoard[^>]*auth=\{auth\}/);
  assert.match(source, /<AdvertisePage qa=\{qa\} auth=\{auth\}/);
  assert.match(source, /<TalentUnlockPage route=\{route\} qa=\{qa\} auth=\{auth\}/);
});

test('job seeker write action does not guess a guest role while account state is loading', async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL('./main.jsx', import.meta.url), 'utf8'),
    readFile(new URL('./styles.css', import.meta.url), 'utf8'),
  ]);
  const board = source.slice(source.indexOf('function JobSeekerBoard'), source.indexOf('function HeadhuntingPage'));

  assert.match(board, /const authLoading = auth\.status === 'loading'/);
  assert.match(board, /authLoading\s*\? <span className="headhunt-board-write auth-action-pending"/);
  assert.match(board, /isHospitalMember\s*\? <span className="headhunt-board-write is-empty"/);
  assert.doesNotMatch(board, /useAuthGate\(/);
  assert.match(styles, /\.headhunt-board-write-slot\{[^}]*flex:0 0 210px/);
  assert.match(styles, /\.auth-action-pending\{[^}]*pointer-events:none/);
});

test('header and mobile actions keep a neutral slot until the role is known', async () => {
  const source = await readFile(new URL('./main.jsx', import.meta.url), 'utf8');

  assert.match(source, /const authLoading = auth\.status === 'loading'/);
  assert.match(source, /header-account auth-action-pending/);
  assert.match(source, /mobile-account-link auth-action-pending/);
  assert.match(source, /const mobileAction = auth\.status === 'loading'\s*\? null/);
  assert.match(source, /disabled=\{authLoading\}[\s\S]*회원 상태 확인 중…/);
});
