import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('repeated top and bottom consultation CTAs are removed from public pages', async () => {
  const [source, medicalStaff] = await Promise.all([
    readFile(new URL('./main.jsx', import.meta.url), 'utf8'),
    readFile(new URL('./MedicalStaffPage.jsx', import.meta.url), 'utf8'),
  ]);

  const home = source.slice(source.indexOf('function HomePage'), source.indexOf('function SmartAdDock'));
  const jobs = source.slice(source.indexOf('function JobsPage'), source.indexOf('export function TalentPage'));
  const advertise = source.slice(source.indexOf('function AdvertisePage'), source.indexOf('function AdvertiseApplyPage'));

  assert.match(home, /의사 초빙정보 보기/);
  assert.doesNotMatch(home, /헤드헌터 상담/);

  assert.doesNotMatch(jobs, /헤드헌팅 상담|헤드헌터에게 상담하기|decision-nudge|ConversionBanner/);

  assert.match(advertise, /광고 상품 선택/);
  assert.doesNotMatch(advertise, /헤드헌터 채용 상담|별도 견적 상담|headhunt-plan/);

  assert.match(medicalStaff, /의료인 이력서·구직 글 등록/);
  assert.doesNotMatch(medicalStaff, /헤드헌터 이직 상담|병원 · 인재 채용 상담/);

  assert.doesNotMatch(source, /function ConversionBanner/);
});

test('dedicated headhunting page keeps its real request workflows', async () => {
  const source = await readFile(new URL('./main.jsx', import.meta.url), 'utf8');
  const page = source.slice(source.indexOf('function HeadhuntingPage'), source.indexOf('function ResumePage'));

  assert.match(page, /의사 헤드헌터에게 상담하기/);
  assert.match(page, /병원 · 채용 의뢰하기/);
});
