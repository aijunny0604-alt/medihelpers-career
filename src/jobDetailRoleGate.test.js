import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('signed-in hospital members see a role notice without another login or signup prompt', async () => {
  const source = await readFile(new URL('./main.jsx', import.meta.url), 'utf8');

  assert.match(source, /const hospitalViewer = Boolean\(/);
  assert.match(source, /상세조건은 의료인 회원만 볼 수 있습니다/);
  assert.match(source, /현재 로그인한 병원회원 계정에서는 보수·근무 일정·채용 조건을 열람하거나 지원할 수 없습니다/);
  assert.match(source, /hospitalViewer \? <div className="doctor-only-aside-note"/);
  assert.match(source, /hospitalViewer \? <em className="doctor-only-role-note"/);
});

test('hospital job details omit subjective workload and treatment-intensity sections', async () => {
  const source = await readFile(new URL('./main.jsx', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /title: "진료 강도"/);
  assert.doesNotMatch(source, /일평균 환자·검사/);
  assert.doesNotMatch(source, /시술·검사 비중/);
  assert.doesNotMatch(source, /수술 및 외래건수\(일\)/);
});

test('anonymous visitors keep the medical-member login path', async () => {
  const source = await readFile(new URL('./main.jsx', import.meta.url), 'utf8');

  assert.match(source, /로그인 후 상세조건 열람/);
  assert.match(source, /로그인 · 회원가입/);
  assert.match(source, /to=\{`\/signup\/doctor\?next=/);
});
