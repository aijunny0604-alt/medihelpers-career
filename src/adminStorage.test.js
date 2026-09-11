import test from 'node:test';
import assert from 'node:assert/strict';
import { backupUploadedAt, formatAdminTime } from './adminStorage.js';

test('backup dates survive the Sites object serialization and retain UTC', () => {
  const key='backups/2026/09/11/medihelpers-daily-2026-09-11T15-00-21-061Z.json';
  assert.equal(backupUploadedAt({key, uploaded:{}}), '2026-09-11T15:00:21.061Z');
  assert.equal(backupUploadedAt({uploaded:new Date('2026-09-11T15:00:00Z')}),'2026-09-11T15:00:00.000Z');
  assert.equal(backupUploadedAt({uploaded:{},customMetadata:{createdAt:'2026-09-12T00:00:00Z'}}),'2026-09-12T00:00:00.000Z');
  assert.equal(backupUploadedAt({key:'unknown',uploaded:{}}),null);
});
test('admin SQL timestamps are rendered in Korea time with safe empty states', () => {
  assert.match(formatAdminTime('2026-09-11 15:00:23'), /2026.*09.*12.*00:00/);
  assert.equal(formatAdminTime({}),'기록 없음');
  assert.equal(formatAdminTime('invalid'),'시각 확인 필요');
});
