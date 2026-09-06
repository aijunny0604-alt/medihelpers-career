import test from 'node:test';
import assert from 'node:assert/strict';
import { addInclusiveExposureDays, buildExposureWindow, normalizeExposureWindow } from './billingPeriods.js';

test('광고 30일은 결제일을 1일째로 포함해 정확히 30개 달력 날짜를 사용한다', () => {
  assert.equal(addInclusiveExposureDays('2026-09-06', 30), '2026-10-05');
  assert.equal(addInclusiveExposureDays('2028-02-10', 30), '2028-03-10');
});

test('광고 시작일은 UTC가 아닌 한국 날짜를 기준으로 정한다', () => {
  assert.deepEqual(buildExposureWindow(30, Date.UTC(2026, 8, 6, 14, 59)), { start:'2026-09-06', end:'2026-10-05', days:30 });
  assert.deepEqual(buildExposureWindow(30, Date.UTC(2026, 8, 6, 15, 1)), { start:'2026-09-07', end:'2026-10-06', days:30 });
});

test('기존 31일로 저장된 광고 응답도 30일 종료일로 보정한다', () => {
  assert.deepEqual(normalizeExposureWindow({ start:'2026-08-16', end:'2026-09-15', days:30 }), { start:'2026-08-16', end:'2026-09-14', days:30 });
});
