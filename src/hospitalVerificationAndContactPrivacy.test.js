import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { hospitalVerificationSchemaStatements } from '../db/schema.js';

const [server, accountPage, resumePage, jobSeekerPostPage, mainPage, adminPage] = await Promise.all([
  readFile(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8'),
  readFile(new URL('./AccountPage.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./ResumePage.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./JobSeekerPostPage.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./main.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./AdminConsolePage.jsx', import.meta.url), 'utf8'),
]);

test('의료인은 구직글에서 연락처 공개 여부를 직접 선택하며 이력서는 비공개 저장된다', () => {
  assert.match(resumePage, /contactVisibility: 'private'/);
  assert.doesNotMatch(resumePage, /열람권 구매 병원에 공개/);
  assert.match(jobSeekerPostPage, /연락처 비공개/);
  assert.match(jobSeekerPostPage, /열람권 구매 병원에 공개/);
  assert.match(jobSeekerPostPage, /contactVisibility: 'private'/);
});

test('열람권이 있어도 비공개 연락처는 서버에서 제거한다', () => {
  assert.match(server, /const contactVisibility = body\.contactVisibility === 'ticket' \? 'ticket' : 'private'/);
  assert.match(server, /delete detail\.name; delete detail\.phone; delete detail\.email/);
  assert.match(server, /storedDetail\.contactVisibility === 'ticket'/);
  assert.match(server, /name:revealContact \? rest\.name : ''/);
  assert.match(server, /contactProtected:protectedContact/);
  assert.match(mainPage, /전화번호 비공개 · 열람권으로도 공개되지 않습니다/);
  assert.match(mainPage, /전화번호 비공개 · 열람권 구매 후에도 미공개/);
  assert.match(mainPage, /jobseeker-contact-private/);
  assert.match(server, /p\.contact_visibility AS contactVisibility/);
});

test('병원 회원은 사업자등록증 제출과 동시에 가입·로그인이 완료된다', () => {
  const schema = hospitalVerificationSchemaStatements.join('\n');
  assert.match(schema, /CREATE TABLE IF NOT EXISTS hospital_verification_requests/);
  assert.match(schema, /document_key TEXT NOT NULL UNIQUE/);
  assert.match(schema, /status TEXT NOT NULL DEFAULT 'approved'/);
  assert.match(accountPage, /requestBody\.append\('businessDocument', businessDocument\)/);
  assert.match(server, /multipart\/form-data/);
  assert.match(server, /body\.role === 'hospital' \? 'verified' : 'unverified'/);
  assert.match(server, /'approved', '가입 즉시 완료', 'system-auto'/);
  assert.match(server, /hospital-immediate-signup-v1/);
  assert.doesNotMatch(server, /HOSPITAL_APPROVAL_PENDING|HOSPITAL_APPROVAL_REJECTED|pendingApproval:true/);
});

test('사업자등록증은 비공개 저장되고 관리자는 제출 이력만 열람한다', () => {
  assert.match(server, /verifications\/hospitals\//);
  assert.match(server, /hospitalVerificationDocumentApi/);
  assert.match(server, /const admin = await adminIdentity\(request, env\)/);
  assert.match(server, /cache-control':'private, no-store'/);
  assert.doesNotMatch(server, /hospital_verification_review/);
  assert.match(server, /관리자 콘솔은 DB 기록 조회 전용입니다/);
  assert.match(adminPage, /병원 회원 사업자등록증 제출 이력/);
  assert.doesNotMatch(adminPage, /onClick=\{\(\) => decide\(item, 'approved'\)\}/);
  assert.match(adminPage, /제출본 열기/);
});
