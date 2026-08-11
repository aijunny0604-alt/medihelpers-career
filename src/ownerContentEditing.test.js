import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const serverSource = await readFile(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8');
const memberCenterSource = await readFile(new URL('./MemberCenterPage.jsx', import.meta.url), 'utf8');
const editorSource = await readFile(new URL('./HospitalAdEditPage.jsx', import.meta.url), 'utf8');
const mainSource = await readFile(new URL('./main.jsx', import.meta.url), 'utf8');

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
  assert.match(editorSource, /결제금액·광고등급·게시기간을 제외한 실제 채용 조건/);
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
