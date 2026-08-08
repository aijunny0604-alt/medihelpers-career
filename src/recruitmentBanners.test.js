import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { jobs } from './data.js';

function jpegDimensions(buffer) {
  assert.equal(buffer[0], 0xff);
  assert.equal(buffer[1], 0xd8);
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    const length = buffer.readUInt16BE(offset);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: buffer.readUInt16BE(offset + 3), width: buffer.readUInt16BE(offset + 5) };
    }
    offset += length;
  }
  throw new Error('JPEG dimensions not found');
}

test('every premium recruitment fixture uses a real 3:1 card banner', async () => {
  const premiumJobs = jobs.filter((job) => job.adTier);
  assert.ok(premiumJobs.length >= 8);

  for (const job of premiumJobs) {
    assert.match(job.cardBanner || '', /^\/banners\/recruit-[a-z-]+-v1\.jpg$/);
    const file = await readFile(path.join('public', job.cardBanner.slice(1)));
    assert.deepEqual(jpegDimensions(file), { width: 1500, height: 500 });
    assert.ok(file.length < 8 * 1024 * 1024, `${job.cardBanner} exceeds 8MB`);
  }
});

