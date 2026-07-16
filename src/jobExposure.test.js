import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AD_TIER_ORDER,
  balancedOrder,
  orderPremium,
  countBy,
  countByDept
} from './jobExposure.js';
import { jobs as catalogJobs } from './data.js';

// 한 진료과(내과)와 한 지역(서울)이 압도적으로 많은 30건 이상의 합성 공고.
function buildSyntheticJobs() {
  const jobs = [];
  // 내과 · 서울 20건 (지배적 카테고리)
  for (let i = 0; i < 20; i += 1) {
    jobs.push({ id: `im-seoul-${i}`, dept: '내과', region: '서울', adTier: undefined });
  }
  // 나머지 진료과/지역 소수
  jobs.push({ id: 'os-busan', dept: '정형외과', region: '부산' });
  jobs.push({ id: 'os-seoul', dept: '정형외과', region: '서울' });
  jobs.push({ id: 'pd-daegu', dept: '소아청소년과', region: '대구' });
  jobs.push({ id: 'pd-seoul', dept: '소아청소년과', region: '서울' });
  jobs.push({ id: 'fm-incheon', dept: '가정의학과', region: '인천' });
  jobs.push({ id: 'fm-gwangju', dept: '가정의학과', region: '광주' });
  jobs.push({ id: 'rd-daejeon', dept: '영상의학과', region: '대전' });
  jobs.push({ id: 'rd-ulsan', dept: '영상의학과', region: '울산' });
  jobs.push({ id: 'pm-jeju', dept: '마취통증의학과', region: '제주' });
  jobs.push({ id: 'pm-gyeonggi', dept: '마취통증의학과', region: '경기' });
  jobs.push({ id: 'im-busan', dept: '내과', region: '부산' });
  jobs.push({ id: 'im-gyeonggi', dept: '내과', region: '경기' });
  return jobs;
}

function countDistinctInWindow(list, key, size) {
  const seen = new Set();
  for (let i = 0; i < Math.min(size, list.length); i += 1) seen.add(list[i][key]);
  return seen.size;
}

test('AD_TIER_ORDER keeps paid precedence', () => {
  assert.deepEqual(AD_TIER_ORDER, ['spotlight', 'featured', 'basic']);
});

test('balancedOrder returns the exact same multiset (no loss, no duplication)', () => {
  const jobs = buildSyntheticJobs();
  const ordered = balancedOrder(jobs, { seed: 0 });
  assert.equal(ordered.length, jobs.length);
  assert.deepEqual(
    ordered.map((j) => j.id).sort(),
    jobs.map((j) => j.id).sort()
  );
  // 원본 배열은 변형되지 않는다.
  assert.equal(jobs[0].id, 'im-seoul-0');
});

test('early slots surface multiple specialties and regions despite a dominant category', () => {
  const jobs = buildSyntheticJobs();
  const ordered = balancedOrder(jobs, { seed: 0 });

  const naiveDept = countDistinctInWindow(jobs, 'dept', 6);
  const balancedDept = countDistinctInWindow(ordered, 'dept', 6);
  const balancedRegion = countDistinctInWindow(ordered, 'region', 6);

  // 균형 노출은 앞쪽 6칸에 여러 진료과가 등장한다.
  assert.ok(balancedDept >= 5, `expected >=5 specialties early, got ${balancedDept}`);
  // 순수 입력 순서보다 확실히 다양해야 한다 (naive는 내과 1종뿐).
  assert.ok(balancedDept > naiveDept, `balanced (${balancedDept}) should beat naive (${naiveDept})`);
  // 지역도 앞쪽에서 여러 개 노출된다.
  assert.ok(balancedRegion >= 4, `expected >=4 regions early, got ${balancedRegion}`);
});

test('same input and seed produce identical, stable output', () => {
  const a = balancedOrder(buildSyntheticJobs(), { seed: 42 });
  const b = balancedOrder(buildSyntheticJobs(), { seed: 42 });
  assert.deepEqual(a.map((j) => j.id), b.map((j) => j.id));
});

test('different seeds rotate the first specialty without dropping items', () => {
  const jobs = buildSyntheticJobs();
  const s0 = balancedOrder(jobs, { seed: 0 });
  const s1 = balancedOrder(jobs, { seed: 1 });
  // 회전이 일어나 첫 항목의 진료과가 달라질 수 있다(집합은 동일).
  assert.deepEqual(s0.map((j) => j.id).sort(), s1.map((j) => j.id).sort());
  assert.notEqual(s0[0].dept, undefined);
});

test('smallest buckets preserve original registration order', () => {
  const jobs = buildSyntheticJobs();
  const ordered = balancedOrder(jobs, { seed: 0 });
  const os = ordered.filter((j) => j.dept === '정형외과').map((j) => j.id);
  // 원본에서 os-busan 이 os-seoul 보다 먼저 등록됨 → 순서 유지.
  assert.deepEqual(os, ['os-busan', 'os-seoul']);
});

test('orderPremium preserves tier precedence while balancing inside each tier', () => {
  const ads = [
    { id: 'sp-im-seoul', dept: '내과', region: '서울', adTier: 'spotlight' },
    { id: 'sp-im-seoul2', dept: '내과', region: '서울', adTier: 'spotlight' },
    { id: 'sp-os-busan', dept: '정형외과', region: '부산', adTier: 'spotlight' },
    { id: 'ft-im-seoul', dept: '내과', region: '서울', adTier: 'featured' },
    { id: 'ft-pd-daegu', dept: '소아청소년과', region: '대구', adTier: 'featured' },
    { id: 'bs-fm-incheon', dept: '가정의학과', region: '인천', adTier: 'basic' }
  ];
  const ordered = orderPremium(ads, { seed: 0 });
  const tiers = ordered.map((j) => j.adTier);
  // 모든 spotlight → featured → basic 순서 유지.
  const rank = { spotlight: 0, featured: 1, basic: 2 };
  for (let i = 1; i < tiers.length; i += 1) {
    assert.ok(rank[tiers[i]] >= rank[tiers[i - 1]], `tier precedence broken at ${i}`);
  }
  // spotlight 3개 중 앞 두 칸에 두 진료과가 등장(등급 내부 균형).
  const spotlight = ordered.filter((j) => j.adTier === 'spotlight');
  assert.equal(spotlight.length, 3);
  assert.notEqual(spotlight[0].dept, spotlight[1].dept);
});

test('countBy / countByDept aggregate specialty counts in first-appearance order', () => {
  const jobs = buildSyntheticJobs();
  const counts = countByDept(jobs);
  const map = Object.fromEntries(counts.map((c) => [c.key, c.count]));
  assert.equal(map['내과'], 22);
  assert.equal(map['정형외과'], 2);
  // 첫 등장 순서 보존: 내과가 맨 앞.
  assert.equal(counts[0].key, '내과');
  // 총합은 전체 개수와 일치.
  assert.equal(counts.reduce((sum, c) => sum + c.count, 0), jobs.length);
  // 임의 키(region)로도 동작.
  const regionCounts = countBy(jobs, (j) => j.region);
  const rmap = Object.fromEntries(regionCounts.map((c) => [c.key, c.count]));
  assert.equal(rmap['서울'], 22);
});

test('handles empty input gracefully', () => {
  assert.deepEqual(balancedOrder([], { seed: 0 }), []);
  assert.deepEqual(balancedOrder(undefined, { seed: 0 }), []);
  assert.deepEqual(orderPremium([], { seed: 0 }), []);
  assert.deepEqual(countBy([]), []);
  assert.deepEqual(countByDept([]), []);
});

test('handles missing dept/region without throwing or losing items', () => {
  const jobs = [
    { id: 'a', dept: '내과', region: '서울' },
    { id: 'b' }, // dept/region 없음
    { id: 'c', dept: '내과' }, // region 없음
    { id: 'd', region: '부산' } // dept 없음
  ];
  const ordered = balancedOrder(jobs, { seed: 0 });
  assert.equal(ordered.length, 4);
  assert.deepEqual(ordered.map((j) => j.id).sort(), ['a', 'b', 'c', 'd']);
  const counts = countByDept(jobs);
  assert.equal(counts.reduce((sum, c) => sum + c.count, 0), 4);
});

test('current premium catalog has enough clearly marked examples for multi-page rotation', () => {
  const spotlight = catalogJobs.filter((job) => job.adTier === 'spotlight');
  const featured = catalogJobs.filter((job) => job.adTier === 'featured');
  const demos = catalogJobs.filter((job) => job.isDemo);

  assert.equal(spotlight.length, 4);
  assert.equal(featured.length, 4);
  assert.equal(demos.length, 6);
  assert.ok(spotlight.length / 2 >= 2, 'spotlight needs at least two desktop carousel pages');
  assert.ok(featured.length / 2 >= 2, 'featured needs at least two desktop carousel pages');

  const firstSeed = orderPremium(catalogJobs.filter((job) => job.adTier), { seed: 0 });
  const nextSeed = orderPremium(catalogJobs.filter((job) => job.adTier), { seed: 1 });
  assert.deepEqual(firstSeed.map((job) => job.id).sort(), nextSeed.map((job) => job.id).sort());
  assert.notDeepEqual(firstSeed.map((job) => job.id), nextSeed.map((job) => job.id));
});
