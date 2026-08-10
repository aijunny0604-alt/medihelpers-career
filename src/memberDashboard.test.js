import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('마이페이지 활동 요약 위젯은 역할별 상세 화면으로 이동한다', async () => {
  const source = await readFile(new URL('./MemberCenterPage.jsx', import.meta.url), 'utf8');

  assert.match(source, /className="member-metric-card"/);
  assert.match(source, /onClick=\{\(\) => openMetricDetail\(label\)\}/);
  assert.match(source, /aria-label=\{`\$\{label\} \$\{value\} 상세보기`\}/);
  assert.match(source, /추천 후보.*member-recommended-candidates/s);
  assert.match(source, /관심 공고.*member-saved-jobs/s);
  assert.match(source, /추천 후보 상세/);
});

test('의료인 이력서 관리 동선은 저장된 서버 이력서를 불러와 수정한다', async () => {
  const [memberCenter, resumePage] = await Promise.all([
    readFile(new URL('./MemberCenterPage.jsx', import.meta.url), 'utf8'),
    readFile(new URL('./ResumePage.jsx', import.meta.url), 'utf8')
  ]);

  assert.match(memberCenter, /role === 'hospital' \? '\/request\/hiring' : '\/resume'/);
  assert.match(memberCenter, /저장된 이력서 수정/);
  assert.match(resumePage, /fetch\(withBase\('\/api\/resumes'\)/);
  assert.match(resumePage, /const resume = result\?\.resume \|\| result\?\.resumes\?\.\[0\]/);
  assert.match(resumePage, /setSavedResumeId\(resume\.id \|\| ''\)/);
  assert.match(resumePage, /photoUrl: detail\.photoUrl \|\| ''/);
  assert.match(resumePage, /if \(createNew\)/);
});

test('inquiry details use a standalone member-center page and sanitize corrupted legacy text', async () => {
  const [memberCenter, main] = await Promise.all([
    readFile(new URL('./MemberCenterPage.jsx', import.meta.url), 'utf8'),
    readFile(new URL('./main.jsx', import.meta.url), 'utf8')
  ]);

  assert.match(memberCenter, /routePath\.startsWith\('\/mypage\/inquiries\/'\)/);
  assert.match(memberCenter, /function InquiryDetailPage/);
  assert.match(memberCenter, /import \{ cleanInquiryText \} from '\.\/inquiryText\.js'/);
  assert.match(memberCenter, /inquiry\.messages\.filter\(\(item\) => cleanInquiryText\(item\?\.body\)\)/);
  assert.match(memberCenter, /지원 내용이 병원 채용담당자에게 전달되었습니다\./);
  assert.match(memberCenter, /const safeName = cleanInquiryText/);
  assert.match(memberCenter, /const safeSource = cleanInquiryText/);
  assert.match(memberCenter, /function isInternalReference/);
  assert.match(memberCenter, /function memberFacingInquiryLabel/);
  assert.match(memberCenter, /canAdmin && <p>\{inquiry\.id \|\| safeSource\}<\/p>/);
  assert.match(memberCenter, /canAdmin \? '내부 접수번호' : '관련 내용'/);
  assert.match(memberCenter, /canAdmin \? safeSource : safeRelatedLabel/);
  assert.doesNotMatch(memberCenter, /<small>\{item\.source\}<\/small>/);
  assert.doesNotMatch(memberCenter, /<small>\{candidate\.code\} ·/);
  assert.doesNotMatch(memberCenter, /InquiryDetailModal/);
  assert.doesNotMatch(memberCenter, /setSelectedInquiry/);
  assert.match(main, /path\.startsWith\('\/mypage\/inquiries\/'\)/);
});
