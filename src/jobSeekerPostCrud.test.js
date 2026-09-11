import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [server, schema, main, editor, member, hospitalEditor, styles] = await Promise.all([
  readFile(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../db/schema.js', import.meta.url), 'utf8'),
  readFile(new URL('./main.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./JobSeekerPostPage.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./MemberCenterPage.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./HospitalAdEditPage.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./styles.css', import.meta.url), 'utf8'),
]);

test('구직글은 이력서와 분리된 원장에 연결하고 삭제 이력을 보존한다', () => {
  assert.match(schema, /CREATE TABLE IF NOT EXISTS job_seeker_posts/);
  assert.match(schema, /FOREIGN KEY \(resume_id\) REFERENCES resumes\(id\)/);
  assert.match(schema, /WHERE status = 'active'/);
  assert.match(server, /UPDATE job_seeker_posts SET status='deleted'/);
  assert.match(server, /p\.status='active'/);
});

test('구직글 CRUD는 의료인 역할과 본인 소유 이력서·게시글을 서버에서 재검증한다', () => {
  const api = server.slice(server.indexOf('async function jobSeekerPostApi'), server.indexOf('async function savedJobsApi'));
  assert.match(api, /adminIdentity\(request, env\)/);
  assert.match(api, /account\.role !== 'doctor'/);
  assert.match(api, /FROM resumes WHERE id=\? AND account_id=\?/);
  assert.match(api, /WHERE id=\? AND account_id=\? AND status<>'deleted'/);
  assert.match(api, /\['POST','PATCH','DELETE'\]/);
});

test('전용 구직글 페이지는 이력서 선택과 게시글 단위 연락처 공개 설정을 제공한다', () => {
  assert.match(main, /path === '\/job-seeker-posts\/new'/);
  assert.match(main, /path\.startsWith\('\/job-seeker-posts\/'\).*endsWith\('\/edit'\)/s);
  assert.match(editor, /연동 이력서 선택/);
  assert.match(editor, /contactVisibility: 'private'/);
  assert.match(editor, /열람권 구매 병원에 공개/);
  assert.match(editor, /연락처 비공개/);
});

test('구직글의 이력서 관리 버튼은 페이지 이동 없이 선택 모달을 연다', () => {
  assert.match(editor, /setResumeManagerOpen\(true\)/);
  assert.match(editor, /role="dialog" aria-modal="true"/);
  assert.match(editor, /현재 화면을 벗어나지 않고 구직글에 연결할 이력서를 바로 바꿀 수 있습니다/);
  assert.doesNotMatch(editor, /className="button outline">이력서 관리<\/a>/);
});

test('이미 구직글이 연결된 이력서는 중복 등록 대신 기존 글 수정으로 안내한다', () => {
  assert.match(editor, /existingPosts/);
  assert.match(editor, /구직글 등록됨/);
  assert.match(editor, /이 이력서에는 이미 구직글이 등록되어 있습니다/);
  assert.match(editor, /기존 구직글 수정/);
});

test('작성자는 게시판과 마이페이지에서 구직글을 수정·삭제한다', () => {
  assert.match(main, /deleteOwnPost/);
  assert.match(main, /jobseeker-owner-actions/);
  assert.match(member, /deleteJobSeekerPost/);
  assert.match(member, /이력서 만들기/);
  assert.match(member, /구직글 등록/);
  assert.match(member, /내 구직글/);
  assert.match(main, /jobseeker-owner-actions-label">내 글 관리/);
  assert.match(styles, /\.jobseeker-owner-actions button\{[^}]*white-space:nowrap[^}]*word-break:keep-all/);
  assert.match(styles, /\.jobseeker-owner-actions\{grid-column:2\/-1!important;grid-row:2/);
  assert.match(styles, /@media\(max-width:760px\)\{\.jobseeker-owner-actions\{grid-column:1\/-1!important;grid-row:auto/);
});

test('구직 게시판과 상세는 작성자가 입력한 게시글 제목을 우선 표시한다', () => {
  assert.match(main, /person\.postTitle \|\| `\$\{person\.dept/);
  assert.match(main, /<h3>\{person\.isDemo && '\[예시\] '\}\{person\.postTitle \|\|/);
  assert.match(server, /title: r\.postTitle \|\| ''/);
});

test('병원 유료 공고는 소유자가 내용만 수정하고 직접 삭제할 수 없다', () => {
  assert.match(server, /body\.action === 'owned_ad_delete'/);
  assert.match(server, /PAID_AD_DELETE_FORBIDDEN/);
  assert.match(hospitalEditor, /유료 병원 공고는 내용 수정만 가능합니다/);
  assert.doesNotMatch(hospitalEditor, /owned_ad_delete/);
});
