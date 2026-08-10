import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('medical staff hero is a large single-column introduction without the access-pass promo card', async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL('./MedicalStaffPage.jsx', import.meta.url), 'utf8'),
    readFile(new URL('./styles.css', import.meta.url), 'utf8'),
  ]);

  const hero = source.match(/<section className="medical-staff-hero seek-hero">([\s\S]*?)<\/section>/)?.[1] || '';

  assert.doesNotMatch(hero, /<aside>/);
  assert.doesNotMatch(hero, /열람권으로<br \/>인재를 확인하세요/);
  assert.match(styles, /\.medical-staff-seek-only \.medical-staff-hero\{[^}]*display:block/);
  assert.match(styles, /\.medical-staff-seek-only \.medical-staff-hero h1\{[^}]*font-size:clamp\(64px,6\.4vw,104px\)/);
  assert.match(styles, /@media\(max-width:760px\)[\s\S]*\.medical-staff-seek-only \.medical-staff-hero h1\{[^}]*font-size:clamp\(46px,12vw,62px\)/);
});
