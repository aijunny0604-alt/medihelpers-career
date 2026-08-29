import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { adminConsoleSchemaStatements } from '../db/schema.js';

const schema = adminConsoleSchemaStatements.join('\n');

test('관리자 콘텐츠는 공고·의료인 공고·인재·공지 유형을 지원한다', () => {
  assert.match(schema, /admin_content_records/);
  for (const type of ['doctor_job', 'medical_job', 'talent_profile', 'notice']) {
    assert.match(schema, new RegExp(type));
  }
});

test('관리자 콘텐츠 공개 상태와 열람 권한을 DB 제약으로 고정한다', () => {
  for (const status of ['draft', 'published', 'hidden', 'closed']) {
    assert.match(schema, new RegExp(status));
  }
  for (const visibility of ['public', 'doctor', 'hospital', 'admin']) {
    assert.match(schema, new RegExp(visibility));
  }
});

test('관리자 콘텐츠는 작성자·수정자·게시 시각을 추적한다', () => {
  assert.match(schema, /created_by/);
  assert.match(schema, /updated_by/);
  assert.match(schema, /published_at/);
  assert.match(schema, /admin_content_records_type_idx/);
});

test('병원 광고 주문은 결제 완료 즉시 공개 공고로 전환된다', async () => {
  const source = await readFile(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8');
  const adminSource = await readFile(new URL('./AdminConsolePage.jsx', import.meta.url), 'utf8');
  assert.match(source, /function adOrderContentRecord/);
  assert.match(source, /contentRecordId/);
  assert.match(source, /insertAdOrderContentStatement/);
  assert.match(source, /async function publishAdOrderContent/);
  assert.match(source, /SET status='published'/);
  assert.match(source, /await publishAdOrderContent\(env, order, approvedMetadataJson\)/);
  assert.match(source, /status:'awaiting_payment'/);
  assert.match(source, /syncAdOrderContentRecords/);
  assert.match(source, /fromHospital:true/);
  assert.match(source, /job_submission/);
  assert.match(source, /contentRecordId:adContentRecord\?\.id/);
  assert.match(source, /ownedAdContentById/);
  assert.doesNotMatch(adminSource, /approveJob|rejectJob|검수 대기/);
});

test('홈페이지 하단은 반복 메뉴 열 없이 브랜드·연락처·사업자 정보만 표시한다', async () => {
  const source = await readFile(new URL('./main.jsx', import.meta.url), 'utf8');
  const footer = source.slice(source.indexOf('function Footer'), source.indexOf('function PageHero'));
  assert.match(footer, /footer-brand-block/);
  assert.match(footer, /footer-contact/);
  assert.match(footer, /footer-bottom/);
  assert.doesNotMatch(footer, /footer-column/);
});

test('공개 화면에는 사전 검수나 확인 후 게시를 암시하는 문구가 없다', async () => {
  const source = await readFile(new URL('./main.jsx', import.meta.url), 'utf8');
  for (const phrase of [
    '확인된 채용정보',
    '등록된 기관 정보',
    '등록 정보 확인',
    '메디헬퍼스 상담 확인',
    '담당자가 조건을 확인한 뒤 결제·게시',
    '담당자가 기간과 조건을 다시 확인',
    '담당자가 확인한 뒤 결제',
  ]) assert.doesNotMatch(source, new RegExp(phrase));
  assert.doesNotMatch(source, /검수/);
  assert.match(source, /결제를 완료하면 바로 공개됩니다/);
});

test('유료 광고 상품 등급과 노출기간을 공개 공고 레코드에 동기화한다', async () => {
  const source = await readFile(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8');
  assert.match(source, /function adTierForProduct/);
  assert.match(source, /id === 'intensive'.*return 'featured'/);
  assert.match(source, /id === 'featured'.*return 'featured'/);
  assert.match(source, /product\.legacy.*현재 판매하지 않는 상품/);
  assert.match(source, /\$\.exposureEnd/);
  assert.match(source, /json_set\(/);
});

test('관리자 화면은 병원 제출 서류를 포함한 DB 기록 전체가 읽기 전용이다', async () => {
  const adminSource = await readFile(new URL('./AdminConsolePage.jsx', import.meta.url), 'utf8');
  const serverSource = await readFile(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8');
  assert.match(adminSource, /DATABASE RECORDS/);
  assert.match(adminSource, /<ContentRecords data=\{data\}/);
  assert.match(adminSource, /<Members data=\{data\}/);
  assert.match(adminSource, /<Payments data=\{data\}/);
  assert.doesNotMatch(adminSource, /section === 'categories'/);
  assert.doesNotMatch(adminSource, /section === 'settings'/);
  assert.doesNotMatch(adminSource, /section === 'features'/);
  assert.doesNotMatch(serverSource, /hospital_verification_review/);
  assert.match(serverSource, /관리자 콘솔은 DB 기록 조회 전용입니다/);
  assert.match(adminSource, /가입 즉시 완료 · 승인 또는 반려 처리 없음/);
  assert.match(serverSource, /관리자 상담 기록은 조회 전용입니다/);
  assert.match(serverSource, /채용 CRM 기록은 조회 전용입니다/);
  assert.match(serverSource, /관리자 백업 화면은 기록 조회 전용입니다/);
});

test('공개 화면에서 관리자는 공고·결제 신청과 수정·삭제 기능을 사용할 수 없다', async () => {
  const source = await readFile(new URL('./main.jsx', import.meta.url), 'utf8');
  const jobsPage = source.slice(source.indexOf('function JobsPage'), source.indexOf('export function TalentPage'));
  const headhuntBoard = source.slice(source.indexOf('function HeadhuntBoard'), source.indexOf('function JobSeekerBoard'));
  const advertise = source.slice(source.indexOf('function AdvertisePage'), source.indexOf('function AboutPage'));
  assert.doesNotMatch(jobsPage, /admin-inline-bar|manageJob=|content_delete/);
  assert.doesNotMatch(headhuntBoard, /admin-inline-bar|content_delete|hb-admin-actions|admin-manage/);
  assert.doesNotMatch(advertise, /adAuth\.isAdmin|capabilities\.admin/);
  assert.match(source, /path === '\/admin\/consultations'.*<AdminConsolePage/);
});
