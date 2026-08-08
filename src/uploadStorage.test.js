import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const serverSource = readFileSync(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8');
const mainSource = readFileSync(new URL('./main.jsx', import.meta.url), 'utf8');
const uploadSource = readFileSync(new URL('./jobPostingUpload.js', import.meta.url), 'utf8');

test('Sites uses the existing R2 binding as an upload fallback', () => {
  assert.match(serverSource, /const uploadStorage = env\.UPLOADS \|\| env\.BACKUPS/);
  assert.match(serverSource, /uploadStorage\.get\(key\)/);
  assert.match(serverSource, /uploadStorage\.put\(objectKey/);
});

test('premium cards use the expanded responsive grid rotation component', () => {
  assert.match(mainSource, /<PremiumAdCarousel items=\{orderedPromoted\} renderCard=\{renderPortalCard\}/);
  assert.match(mainSource, /PREMIUM_GRID_SLOTS = \{ mobile: 2, tablet: 4, desktop: 6 \}/);
});

test('home and jobs cards open JobDetail without route navigation', () => {
  assert.match(mainSource, /onOpen=\{\(\) => setSelectedJob\(job\)\}/);
  assert.match(mainSource, /setSelectedJob\(job\); \}/);
});

test('hospital job checkout uploads selected images before creating its payment order', () => {
  assert.match(uploadSource, /fetch\(withBase\('\/api\/uploads'\)/);
  assert.match(uploadSource, /'x-upload-purpose': purpose/);
  assert.match(mainSource, /await uploadJobImage\(brandFile, "logo"\)/);
  assert.match(mainSource, /facilityPhotos\.map\(\(photo\) => uploadJobImage\(photo\.file, "facility"\)\)/);
  assert.match(mainSource, /data\.hospitalPhotoUrls = hospitalPhotoUrls/);
});

test('hospital job records retain uploaded image URLs for public cards', () => {
  assert.match(serverSource, /const logo = cleanOrderValue\(meta\.logo \|\| meta\.brandImageUrl/);
  assert.match(serverSource, /facilityPhotos,/);
  assert.match(serverSource, /facility,/);
});
