import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('auth-sensitive pages reuse the single app account lookup', async () => {
  const [source, medicalStaff, headhunter, profileHook] = await Promise.all([
    readFile(new URL('./main.jsx', import.meta.url), 'utf8'),
    readFile(new URL('./MedicalStaffPage.jsx', import.meta.url), 'utf8'),
    readFile(new URL('./HeadHunterRequestPage.jsx', import.meta.url), 'utf8'),
    readFile(new URL('./useAccountProfile.js', import.meta.url), 'utf8'),
  ]);

  assert.equal((source.match(/useAuthGate\(/g) || []).length, 2);
  assert.match(source, /<JobsPage route=\{route\} qa=\{qa\} auth=\{auth\}/);
  assert.match(source, /<JobSeekerBoard[^>]*auth=\{auth\}/);
  assert.match(source, /<AdvertisePage qa=\{qa\} auth=\{auth\}/);
  assert.match(source, /<TalentUnlockPage route=\{route\} qa=\{qa\} auth=\{auth\}/);
  assert.equal((source.match(/fetch\('\/api\/account'/g) || []).length, 1);
  assert.doesNotMatch(medicalStaff, /\/api\/account/);
  assert.doesNotMatch(headhunter, /\/api\/account/);
  assert.doesNotMatch(profileHook, /fetch\(/);
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
  assert.match(source, /smart-ad-dock-cta auth-action-pending/);
  assert.match(source, /tier-apply-button featured auth-action-pending/);
  assert.match(source, /price-action-pending/);
  assert.doesNotMatch(source, /회원 상태 확인 중…/);
});

test('admin console hides demo controls until its database response is ready', async () => {
  const source = await readFile(new URL('./AdminConsolePage.jsx', import.meta.url), 'utf8');
  assert.match(source, /if \(loading && !qa\)/);
  assert.match(source, /admin-console admin-console-loading/);
  assert.match(source, /운영 DB 기록을 불러오고 있습니다/);
});

test('local QA mock switches the same doctor, admin, and hospital roles as production', async () => {
  const source = await readFile(new URL('./devApiMock.js', import.meta.url), 'utf8');
  assert.match(source, /path === '\/api\/auth\/test-switch'/);
  assert.match(source, /\['doctor', 'admin', 'hospital'\]\.includes\(body\.key\)/);
  assert.match(source, /write\(LS\.authSession, \{ email, role \}\)/);
});
