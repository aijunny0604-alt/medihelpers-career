import test from 'node:test';
import assert from 'node:assert/strict';
import { getHospitalMood, inferHospitalMood, premiumBannerGuide } from './hospitalMood.js';

test('assigns a curated mood from hospital characteristics', () => {
  assert.equal(inferHospitalMood({ hospital: '\uC544\uC774\uC0AC\uB791\uBCD1\uC6D0', dept: '\uC18C\uC544\uCCAD\uC18C\uB144\uACFC' }), 'pediatric');
  assert.equal(inferHospitalMood({ hospital: '\uC1A1\uB3C4\uD504\uB77C\uC784\uAC80\uC9C4\uC13C\uD130', dept: '\uB0B4\uACFC' }), 'checkup');
  assert.equal(inferHospitalMood({ hospital: '\uBC14\uB978\uCC99\uCD94\uBCD1\uC6D0', dept: '\uC815\uD615\uC678\uACFC' }), 'spine');
  assert.equal(inferHospitalMood({ hospital: '\uC628\uC5EC\uC131\uC758\uC6D0', dept: '\uAC00\uC815\uC758\uD559\uACFC' }), 'women');
});

test('keeps a stable safe fallback for the same hospital', () => {
  const first = getHospitalMood({ hospital: '\uBA54\uB514\uC11C\uC6B8\uBCD1\uC6D0' });
  const second = getHospitalMood({ hospital: '\uBA54\uB514\uC11C\uC6B8\uBCD1\uC6D0' });
  assert.deepEqual(first, second);
  assert.match(first.primary, /^#[0-9a-f]{6}$/i);
});

test('uses an approved brand color without changing the safe surface palette', () => {
  const mood = getHospitalMood({ hospital: '\uC544\uC774\uC0AC\uB791\uBCD1\uC6D0', dept: '\uC18C\uC544\uCCAD\uC18C\uB144\uACFC', brandColor: '#6549c7' });
  assert.equal(mood.primary, '#6549c7');
  assert.equal(mood.surface, '#f5f1ff');
});

test('defines the premium banner as 3:1 with an 8MB limit', () => {
  assert.equal(premiumBannerGuide.width / premiumBannerGuide.height, 3);
  assert.equal(premiumBannerGuide.maxBytes, 8 * 1024 * 1024);
  assert.ok(premiumBannerGuide.minRatio < 3 && premiumBannerGuide.maxRatio > 3);
});
