import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server = readFileSync(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8');
const schema = readFileSync(new URL('../db/schema.js', import.meta.url), 'utf8');
const recoveryPage = readFileSync(new URL('./AccountRecoveryPage.jsx', import.meta.url), 'utf8');
const resumePage = readFileSync(new URL('./ResumePage.jsx', import.meta.url), 'utf8');
const requestPage = readFileSync(new URL('./HeadHunterRequestPage.jsx', import.meta.url), 'utf8');

test('계정 도움 요청은 성공 화면 전에 D1 API 저장 결과를 확인한다', () => {
  assert.match(schema, /CREATE TABLE IF NOT EXISTS account_recovery_requests/);
  assert.match(server, /pathname === '\/api\/account-recovery'/);
  assert.match(server, /INSERT INTO account_recovery_requests/);
  assert.match(recoveryPage, /fetch\(withBase\('\/api\/account-recovery'\)/);
  assert.match(recoveryPage, /if \(!response\.ok \|\| !result\.accepted \|\| !result\.requestId\) throw/);
  assert.doesNotMatch(recoveryPage, /setDone\(true\)/);
});

test('이력서 문서 첨부를 가장하지 않고 실제 업로드되는 프로필 사진만 받는다', () => {
  assert.match(resumePage, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(resumePage, /uploadResumePhoto\(photoFile\)/);
  assert.doesNotMatch(resumePage, /accept="[^"]*(pdf|docx)/i);
  assert.doesNotMatch(requestPage, /name="attachment"/);
  assert.doesNotMatch(requestPage, /attachmentName:\s*file/);
});
