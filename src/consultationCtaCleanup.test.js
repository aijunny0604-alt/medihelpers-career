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

  assert.match(medicalStaff, /새 구직글 등록/);
  assert.doesNotMatch(medicalStaff, /헤드헌터 이직 상담|병원 · 인재 채용 상담/);

  assert.doesNotMatch(source, /function ConversionBanner/);
});

test('dedicated headhunting page keeps its real request workflows', async () => {
  const source = await readFile(new URL('./main.jsx', import.meta.url), 'utf8');
  const page = source.slice(source.indexOf('function HeadhuntingPage'), source.indexOf('function ResumePage'));

  assert.match(page, /의사 헤드헌터에게 상담하기/);
  assert.match(page, /병원 · 채용 의뢰하기/);
  assert.doesNotMatch(page, /<ConsultationForm/);
  assert.doesNotMatch(page, /TWO-SIDED DOCTOR HEADHUNTING/);
  assert.doesNotMatch(page, /상담부터 입사까지, 이렇게 진행합니다/);
  assert.doesNotMatch(page, /className="headhunting-steps"/);
  assert.doesNotMatch(page, /공고보다 먼저,/);
  assert.doesNotMatch(page, /className="consult-points"/);
});

test('headhunting board keeps a fuller and more readable default list', async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL('./main.jsx', import.meta.url), 'utf8'),
    readFile(new URL('./styles.css', import.meta.url), 'utf8'),
  ]);
  const samples = source.slice(source.indexOf('const SAMPLE_HEADHUNT_POSTS'), source.indexOf('function buildHeadhuntPosts'));

  assert.equal((samples.match(/id:'sample-/g) || []).length, 12);
  assert.match(styles, /\.hb-title\{[^}]*font-size:19px/);
  assert.match(styles, /\.headhunt-board-row>span,.headhunt-board-row>time\{padding:24px 22px\}/);
});
