import test from 'node:test';
import assert from 'node:assert/strict';
import { getAdTierPresentation } from './adTierPresentation.js';

test('메인 광고 등급은 featured와 레거시 spotlight에 동일하게 표시된다', () => {
  assert.deepEqual(getAdTierPresentation('featured'), {
    key: 'main',
    label: '메인 광고',
    description: '메인 영역 우선 노출',
  });
  assert.deepEqual(getAdTierPresentation('spotlight'), getAdTierPresentation('featured'));
});

test('베이직 광고와 광고가 아닌 공고를 구분한다', () => {
  assert.deepEqual(getAdTierPresentation('basic'), {
    key: 'basic',
    label: '베이직 광고',
    description: '기본 광고 노출',
  });
  assert.equal(getAdTierPresentation(undefined), null);
  assert.equal(getAdTierPresentation('unknown'), null);
});

