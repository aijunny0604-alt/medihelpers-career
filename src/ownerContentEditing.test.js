import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const serverSource = await readFile(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8');
const memberCenterSource = await readFile(new URL('./MemberCenterPage.jsx', import.meta.url), 'utf8');
const editorSource = await readFile(new URL('./HospitalAdEditPage.jsx', import.meta.url), 'utf8');
const mainSource = await readFile(new URL('./main.jsx', import.meta.url), 'utf8');
const stylesSource = await readFile(new URL('./styles.css', import.meta.url), 'utf8');

test('hospital ad editing is routed from the owned-ad card to a standalone page', () => {
  assert.match(mainSource, /path\.startsWith\('\/mypage\/ads\/'\)/);
  assert.match(memberCenterSource, /<HospitalAdEditPage ad=\{selectedOwnedAd\}/);
  assert.match(memberCenterSource, /`\/mypage\/ads\/\$\{encodeURIComponent\(item\.contentRecordId\)\}\/edit`/);
  assert.match(memberCenterSource, /공고 수정/);
});

test('server checks the logged-in hospital account and paid order before an update', () => {
  const branch = serverSource.slice(
    serverSource.indexOf("if (body.action === 'owned_ad_update')"),
    serverSource.indexOf("if (body.action === 'refund_request')")
  );
  assert.match(branch, /account\.role !== 'hospital'/);
  assert.match(branch, /o\.account_id=\?/);
  assert.match(branch, /o\.product_type='doctor_ad'/);
  assert.match(branch, /o\.status IN \('paid','awaiting_payment'\)/);
  assert.match(branch, /c\.content_type IN \('doctor_job','medical_job'\)/);
  assert.match(branch, /UPDATE admin_content_records SET title=\?, subtitle=\?, payload_json=\?, updated_by=\?/);
});

test('owner edit preserves billing and exposure metadata while updating authored fields', () => {
  const branch = serverSource.slice(
    serverSource.indexOf("if (body.action === 'owned_ad_update')"),
    serverSource.indexOf("if (body.action === 'refund_request')")
  );
  assert.match(branch, /const nextPayload = \{\s*\.\.\.current,/);
  assert.doesNotMatch(branch, /adTier\s*:\s*s\(source\./);
  assert.doesNotMatch(branch, /exposure(?:End)?\s*:\s*s\(source\./);
  assert.match(editorSource, /초빙 분야를 확인하고 급여·근무 일정·추가 안내만 간단히 수정/);
});

test('ad image replacement supports select, drag-and-drop, and clipboard paste', () => {
  assert.match(editorSource, /dropImageFiles\(event/);
  assert.match(editorSource, /pasteImageFiles\(event/);
  assert.match(editorSource, /uploadJobImage\(logoFile, 'logo'\)/);
  assert.match(editorSource, /uploadJobImage\(bannerFile, 'banner'\)/);
});

test('medical professional keeps the existing owner-edit route through the saved resume', () => {
  assert.match(memberCenterSource, /저장된 이력서 수정/);
  assert.match(memberCenterSource, /role === 'hospital' \? '\/request\/hiring' : '\/resume'/);
});

test('hospital job conditions use only four practical inputs while preserving legacy data', () => {
  const createSection = mainSource.slice(
    mainSource.indexOf('<div><h2>채용조건</h2>'),
    mainSource.indexOf('<section className="ad-form-section ad-form-final">')
  );
  assert.match(createSection, /name="department"/);
  assert.match(createSection, /name="salaryBasis"/);
  assert.match(createSection, /name="exactHours"/);
  assert.match(createSection, /name="introduction"/);
  for (const obsolete of ['incentive','onCall','patientLoad','procedureScope','supportTeam','leavePolicy','startTiming','interviewProcess','verifiedNote']) {
    assert.doesNotMatch(createSection, new RegExp(`name="${obsolete}"`));
  }
  assert.doesNotMatch(createSection, /membership-intake/);
  assert.match(editorSource, /초빙 분야 \*/);
  assert.match(editorSource, /급여·근무 일정·추가 안내만 간단히 수정/);
  assert.match(editorSource, /incentive:payload\.incentive/);
  assert.match(editorSource, /content:\{ \.\.\.form, logo, banner \}/);
});

test('hospital job registration uses a large readable desktop form scale', () => {
  const start = stylesSource.indexOf('/* 공고 등록 페이지는 긴 입력 흐름을 편하게 읽도록');
  const end = stylesSource.indexOf('/* Premium recruitment artwork', start);
  const scale = stylesSource.slice(start, end);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  assert.match(scale, /\.ad-form-section\{padding:40px 42px/);
  assert.match(scale, /\.ad-form-section-head h2\{font-size:28px/);
  assert.match(scale, /label>span\{font-size:16px/);
  assert.match(scale, /min-height:60px[^}]*font-size:17px/);
  assert.match(scale, /\.sample-banner-grid strong\{[^}]*font-size:14px/);
  assert.match(scale, /@media\(min-width:781px\) and \(max-width:1180px\)/);
});
