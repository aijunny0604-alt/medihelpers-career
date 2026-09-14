import test from 'node:test';
import assert from 'node:assert/strict';
import { postPublicUntil, postStatusLabel } from './jobPostLifecycle.js';

test('publication expires after five calendar months with month-end clamping', () => {
  assert.equal(postPublicUntil('2026-09-30 12:34:56'), '2027-02-28 12:34:56');
  assert.equal(postPublicUntil('2027-09-30 12:34:56'), '2028-02-29 12:34:56');
  assert.equal(postPublicUntil('2026-01-31T23:59:59Z'), '2026-06-30 23:59:59');
  assert.equal(postPublicUntil('2026-09-15 00:00:00'), '2027-02-15 00:00:00');
  assert.equal(postPublicUntil('2026-02-28T20:00:00Z'), '2026-07-31 20:00:00');
  assert.equal(postPublicUntil('invalid'), '');
});
test('manual and inactive hiding have distinct member labels', () => {
  assert.equal(postStatusLabel({status:'active'}), '공개 중');
  assert.equal(postStatusLabel({status:'closed',hiddenReason:'manual'}), '비공개');
  assert.equal(postStatusLabel({status:'closed',hiddenReason:'inactive'}), '5개월 미관리 · 자동 비공개');
});
