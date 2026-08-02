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

test('실제 업로드되지 않는 이력서 파일 선택 UI를 노출하지 않는다', () => {
  assert.doesNotMatch(resumePage, /type="file"/);
  assert.doesNotMatch(requestPage, /name="attachment"/);
  assert.doesNotMatch(requestPage, /attachmentName:\s*file/);
});
