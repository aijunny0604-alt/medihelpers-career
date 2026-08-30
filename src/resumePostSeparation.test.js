import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const resumePage = readFileSync(new URL('./ResumePage.jsx', import.meta.url), 'utf8');
const postPage = readFileSync(new URL('./JobSeekerPostPage.jsx', import.meta.url), 'utf8');
const adminPage = readFileSync(new URL('./AdminConsolePage.jsx', import.meta.url), 'utf8');
const server = readFileSync(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8');

test('이력서 저장은 구직글 공개 설정 없이 항상 개인 문서로 저장된다', () => {
  assert.doesNotMatch(resumePage, /구직 등록 \(채용기관 공개\)/);
  assert.doesNotMatch(resumePage, /activeStep === 'visibility'/);
  assert.match(resumePage, /visibility: 'private'/);
  assert.match(resumePage, /저장만으로 구직 게시판에 공개되지 않습니다/);
  const resumeApi = server.slice(server.indexOf('async function resumeApi'), server.indexOf('async function jobSeekerPostApi'));
  assert.match(resumeApi, /const visibility = 'private'/);
  assert.match(resumeApi, /const contactVisibility = 'private'/);
});

test('구직글은 저장된 이력서를 선택하고 없으면 작성 후 되돌아온다', () => {
  assert.match(postPage, /연동 이력서 선택/);
  assert.match(postPage, /resumeId/);
  assert.match(postPage, /\/resume\?new=1&next=/);
  assert.match(postPage, /먼저 이력서를 작성해주세요/);
  assert.match(server, /SELECT id FROM resumes WHERE id = \? AND account_id = \?/);
});

test('관리자는 이력서 상세 JSON을 파싱해 읽기 쉬운 상세 창으로 확인한다', () => {
  assert.match(server, /r\.detail_json AS detailJson/);
  assert.match(server, /detail:parseJsonObject\(detailJson\)/);
  assert.match(adminPage, /function AdminResumeDetail/);
  assert.match(adminPage, /이력서 전체 내용/);
  assert.match(adminPage, /첨부된 의사 이력서/);
  assert.doesNotMatch(adminPage.slice(adminPage.indexOf('function MonitorDetail'), adminPage.indexOf('function Categories')), /JSON\.stringify\(value, null, 2\)/);
});
