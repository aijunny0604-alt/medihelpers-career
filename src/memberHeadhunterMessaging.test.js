import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [memberCenter, server] = await Promise.all([
  readFile(new URL('./MemberCenterPage.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8')
]);

test('병원과 의사 회원은 마이페이지에서 헤드헌터에게 직접 문의할 수 있다', () => {
  assert.match(memberCenter, /function HeadhunterMessagePanel/);
  assert.match(memberCenter, /헤드헌터에게 메시지 보내기/);
  assert.match(memberCenter, /submissionChannel:'mypage_headhunter'/);
  assert.match(memberCenter, /role === 'hospital'.*채용 문의 보내기.*이력서와 구직 문의 보내기/s);
  assert.match(memberCenter, /<HeadhunterMessagePanel role=\{role\}/);
});

test('의료인 중 가입 직군이 의사인 회원만 이력서 첨부 구직 문의를 보낸다', () => {
  assert.match(memberCenter, /doctorEligible = role === 'doctor' && String\(professionType\)\.trim\(\) === '의사'/);
  assert.match(memberCenter, /<ResumeSubmitPicker selectedId=\{resumeId\} onSelect=\{setResumeId\} optional=\{false\} \/>/);
  assert.match(memberCenter, /헤드헌터에게 전달할 이력서를 선택해 주세요/);
  assert.match(server, /professionType \|\| ''\)\.trim\(\) !== '의사'/);
  assert.match(server, /payload\.submissionChannel === 'mypage_headhunter' && !payload\.resumeId/);
  assert.match(server, /FROM resumes WHERE id = \? AND account_id = \? LIMIT 1/);
});

test('마이페이지 문의는 관리자 상담 기록과 회원 알림·활동에 함께 남는다', () => {
  assert.match(server, /requestedChannel === 'mypage_headhunter'/);
  assert.match(server, /payload\.submissionChannel === 'mypage_headhunter' && account\?\.id/);
  assert.match(server, /INSERT INTO member_activity/);
  assert.match(server, /INSERT INTO member_notifications/);
  assert.match(server, /sendConsultationEmail\(env, record\)/);
});
