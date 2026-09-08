import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { cleanDisplayText, isUnreadableText, sanitizeDisplayData } from './textIntegrity.js';

test('detects replacement characters, placeholder-only values, and common mojibake', () => {
  for (const value of ['����', '???', '□□□', 'ì •í˜•ì™¸ê³¼']) {
    assert.equal(isUnreadableText(value), true, value);
  }
  assert.equal(isUnreadableText('김○○'), false);
  assert.equal(isUnreadableText('정형외과 전문의'), false);
});

test('recursively removes unreadable display strings without changing valid data', () => {
  assert.deepEqual(sanitizeDisplayData({ title:'정상 제목', region:'����', rows:['김○○', '???'], count:2 }), {
    title:'정상 제목', region:'', rows:['김○○', ''], count:2,
  });
  assert.equal(cleanDisplayText('����', '전국'), '전국');
});

test('worker responses sanitize legacy broken text before JSON serialization', async () => {
  const source = await readFile(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8');
  assert.match(source, /function sanitizeResponseData/);
  assert.match(source, /JSON\.stringify\(sanitizeResponseData\(data\)\)/);
});
