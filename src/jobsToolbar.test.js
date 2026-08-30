import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('병원 채용 페이지 중간 도구 모음에는 공고 등록만 남긴다', async () => {
  const source = await readFile(new URL('./main.jsx', import.meta.url), 'utf8');
  const start = source.indexOf('<nav className="job-hub-nav jobs-hub-nav"');
  const end = source.indexOf('</nav>', start);
  const toolbar = source.slice(start, end);

  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  assert.match(toolbar, /<Plus \/> 공고 등록 <ArrowRight \/>/);
  assert.match(toolbar, /advertise\/apply\?plan=\$\{adPlans\[0\]\.id\}/);
  assert.doesNotMatch(toolbar, /signup\/hospital/);
  assert.doesNotMatch(toolbar, />전체 채용<|>의료인 구인구직<|>맞춤 초빙<|>내 활동</);
});

test('채용정보 제목과 공고 등록 버튼은 가까이 정렬된 큰 주 행동으로 표시한다', async () => {
  const styles = await readFile(new URL('./styles.css', import.meta.url), 'utf8');

  assert.match(styles, /\.jobs-hub-nav>div\{[^}]*width:min\(1440px,calc\(100% - 96px\)\)[^}]*justify-content:flex-start[^}]*gap:26px/);
  assert.match(styles, /\.jobs-hub-nav \.job-hub-title\{[^}]*font-size:clamp\(25px,1\.8vw,30px\)/);
  assert.match(styles, /\.jobs-hub-nav a\.job-hub-register\{[^}]*min-height:56px[^}]*background:linear-gradient[^}]*font-size:16px/);
  assert.match(styles, /@media\(max-width:780px\)[\s\S]*\.jobs-hub-nav>div\{[^}]*justify-content:space-between/);
});
