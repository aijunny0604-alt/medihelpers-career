import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [server, schema, main, editor, member, hospitalEditor] = await Promise.all([
  readFile(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../db/schema.js', import.meta.url), 'utf8'),
  readFile(new URL('./main.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./JobSeekerPostPage.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./MemberCenterPage.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./HospitalAdEditPage.jsx', import.meta.url), 'utf8'),
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

test('작성자는 게시판과 마이페이지에서 구직글을 수정·삭제한다', () => {
  assert.match(main, /deleteOwnPost/);
  assert.match(main, /jobseeker-owner-actions/);
  assert.match(member, /deleteJobSeekerPost/);
  assert.match(member, /새 구직글 등록/);
  assert.match(member, /내 구직글/);
});

test('병원 유료 공고는 소유자가 내용만 수정하고 직접 삭제할 수 없다', () => {
  assert.match(server, /body\.action === 'owned_ad_delete'/);
  assert.match(server, /PAID_AD_DELETE_FORBIDDEN/);
  assert.match(hospitalEditor, /유료 병원 공고는 내용 수정만 가능합니다/);
  assert.doesNotMatch(hospitalEditor, /owned_ad_delete/);
});
