import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { hospitalVerificationSchemaStatements } from '../db/schema.js';

const [server, accountPage, resumePage, mainPage, adminPage] = await Promise.all([
  readFile(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8'),
  readFile(new URL('./AccountPage.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./ResumePage.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./main.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./AdminConsolePage.jsx', import.meta.url), 'utf8'),
]);

test('의료인이 연락처 공개 여부를 직접 선택하며 기본값은 비공개다', () => {
  assert.match(resumePage, /contactVisibility: 'private'/);
  assert.match(resumePage, /연락처 비공개 \(권장\)/);
  assert.match(resumePage, /열람권 구매 병원에 공개/);
  assert.match(resumePage, /contactVisibility: form\.contactVisibility/);
});

test('열람권이 있어도 비공개 연락처는 서버에서 제거한다', () => {
  assert.match(server, /const contactVisibility = body\.contactVisibility === 'ticket' \? 'ticket' : 'private'/);
  assert.match(server, /delete detail\.name; delete detail\.phone; delete detail\.email/);
  assert.match(server, /storedDetail\.contactVisibility === 'ticket'/);
  assert.match(server, /name:revealContact \? rest\.name : ''/);
  assert.match(server, /contactProtected:protectedContact/);
  assert.match(mainPage, /연락처는 작성자 설정으로 비공개입니다/);
});

test('병원 회원은 사업자등록증 제출 후 승인 대기 상태가 된다', () => {
  const schema = hospitalVerificationSchemaStatements.join('\n');
  assert.match(schema, /CREATE TABLE IF NOT EXISTS hospital_verification_requests/);
  assert.match(schema, /document_key TEXT NOT NULL UNIQUE/);
  assert.match(schema, /status IN \('pending','approved','rejected'\)/);
  assert.match(accountPage, /requestBody\.append\('businessDocument', businessDocument\)/);
  assert.match(server, /multipart\/form-data/);
  assert.match(server, /pendingApproval:true/);
  assert.match(server, /HOSPITAL_APPROVAL_PENDING/);
});

test('사업자등록증은 비공개 저장되고 관리자만 승인·열람한다', () => {
  assert.match(server, /verifications\/hospitals\//);
  assert.match(server, /hospitalVerificationDocumentApi/);
  assert.match(server, /const admin = await adminIdentity\(request, env\)/);
  assert.match(server, /cache-control':'private, no-store'/);
  assert.match(server, /action !== 'hospital_verification_review'/);
  assert.match(adminPage, /병원 회원 가입 서류 검토/);
  assert.match(adminPage, /제출본 열기/);
});

