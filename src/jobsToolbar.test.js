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
  assert.match(toolbar, />공고 등록<\/Link>/);
  assert.match(toolbar, /signup\/hospital\?next=\/advertise/);
  assert.doesNotMatch(toolbar, />전체 채용<|>의료인 구인구직<|>맞춤 초빙<|>내 활동</);
});
