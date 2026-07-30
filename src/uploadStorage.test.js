import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const serverSource = readFileSync(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8');
const mainSource = readFileSync(new URL('./main.jsx', import.meta.url), 'utf8');

test('Sites uses the existing R2 binding as an upload fallback', () => {
  assert.match(serverSource, /const uploadStorage = env\.UPLOADS \|\| env\.BACKUPS/);
  assert.match(serverSource, /uploadStorage\.get\(key\)/);
  assert.match(serverSource, /uploadStorage\.put\(objectKey/);
});

test('premium cards use the mounted rotation component', () => {
  assert.match(mainSource, /<PremiumAdCarousel items=\{orderedPromoted\} renderCard=\{renderPortalCard\}/);
});

test('home and jobs cards open JobDetail without route navigation', () => {
  assert.match(mainSource, /onOpen=\{\(\) => setSelectedJob\(job\)\}/);
  assert.match(mainSource, /setSelectedJob\(job\); \}/);
});
