import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const main = readFileSync(new URL('./main.jsx', import.meta.url), 'utf8');
const operations = readFileSync(new URL('./siteOperations.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

test('메인 채용광고는 DB 목록이 확정되기 전에 예시 공고를 노출하지 않는다', () => {
  assert.match(operations, /ready:\s*false/);
  assert.match(operations, /setState\(\{ operations:value, ready:true \}\)/);
  assert.match(main, /<HomePage liveJobs=\{liveJobs\} jobsReady=\{operations\.ready\}/);
  assert.match(main, /jobsReady\s*\?\s*<PremiumAdCarousel/);
  assert.match(main, /:\s*<HomePremiumLoading/);
});

test('최신 메인 채용광고 로딩 영역은 실제 카드와 비슷한 높이를 유지한다', () => {
  assert.match(main, /aria-label="최신 메인 채용공고 불러오는 중"/);
  assert.match(styles, /\.home-premium-loading\{[^}]*min-height:430px/);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)[^{]*\{\.home-premium-loading-card/);
});
