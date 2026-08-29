import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('only private headhunting positions keep the doctor-member gate', async () => {
  const source = await readFile(new URL('./main.jsx', import.meta.url), 'utf8');

  assert.match(source, /const restricted = job\.badge === "비공개"/);
  assert.doesNotMatch(source, /const restricted = isAd \|\|/);
  assert.match(source, /Boolean\(!restricted \|\|/);
  assert.match(source, /누구나 전체 열람/);
  assert.match(source, /restricted && viewerAccess\.loading/);
  assert.match(source, /const hospitalViewer = Boolean\(/);
  assert.match(source, /상세조건은 의료인 회원만 볼 수 있습니다/);
  assert.match(source, /현재 로그인한 병원회원 계정에서는 보수·근무 일정·채용 조건을 열람하거나 지원할 수 없습니다/);
  assert.match(source, /<div className="doctor-only-aside-note"><LockKeyhole \/><strong>의료인 회원 전용<\/strong>/);
  assert.match(source, /hospitalViewer \? <em className="doctor-only-role-note"/);
});

test('hospital job details omit subjective workload and treatment-intensity sections', async () => {
  const source = await readFile(new URL('./main.jsx', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /title: "진료 강도"/);
  assert.doesNotMatch(source, /일평균 환자·검사/);
  assert.doesNotMatch(source, /시술·검사 비중/);
  assert.doesNotMatch(source, /수술 및 외래건수\(일\)/);
});

test('private positions explain the medical-member restriction without auth promotion', async () => {
  const source = await readFile(new URL('./main.jsx', import.meta.url), 'utf8');
  const jobDetail = source.slice(source.indexOf('function JobDetail('), source.indexOf('function JobDetailRoute'));

  assert.match(jobDetail, /의료인 회원 전용 상세조건/);
  assert.match(jobDetail, /의료인 회원 권한에서만 확인할 수 있습니다/);
  assert.doesNotMatch(jobDetail, /로그인 · 회원가입/);
  assert.doesNotMatch(jobDetail, /to=\{`\/signup\/doctor\?next=/);
});
