import test from 'node:test';
import assert from 'node:assert/strict';
import { hospitalLogoWindow, bannerResolutionNotice } from './hospitalBrandImage.js';

test('only verified immutable legacy assets receive a whitespace window', () => {
  const hash = 'bbeed3a66398fcdd621e430847f0b2b86873d78e7af442b0f730c93e3d450394';
  assert.deepEqual(hospitalLogoWindow(`/legacy-media/${hash}.png`), hospitalLogoWindow(`https://www.medihelpers.co.kr/legacy-media/${hash}.png?v=1`));
  for (const src of [null, '', '/new-logo.png', `/uploads/${hash}.png`, '/legacy-media/unknown.png']) assert.equal(hospitalLogoWindow(src), null);
});
test('all four original logos preserve proportions, remain within source and never upscale', () => {
  for (const hash of ['2cd972f2b8155acd837d783d5f6d726d6e60c34d4dc4355ab2729e2bf2760e3e', '6258da49cc0d562cf9c18a9b7c1bf47e6db5fc53c615c0918f4f9a9646cfb986', 'bbeed3a66398fcdd621e430847f0b2b86873d78e7af442b0f730c93e3d450394', '2cb721b4c8f49f4d6b083677e3a31ad4c5996c53dca8732ad93bc347cae0aeed']) {
    const f = hospitalLogoWindow(`/legacy-media/${hash}.png`);
    assert.ok(f.width <= 180 && f.height <= 82 && f.imageWidth <= 207);
    assert.ok(Math.abs(f.imageWidth / f.imageHeight - 207 / 160) < 1e-10);
    assert.ok(f.left <= 0 && f.top <= 0 && f.width - f.left <= f.imageWidth && f.height - f.top <= f.imageHeight);
  }
});
test('small or narrow banner warnings include dimensions and do not claim upload is blocked', () => {
  for (const [w, h] of [[207, 160], [1500, 150], [600, 800]]) {
    assert.match(bannerResolutionNotice(w, h), new RegExp(`${w}×${h}px`));
    assert.match(bannerResolutionNotice(w, h), /등록할 수/);
  }
  for (const [w, h] of [[1500, 500], [900, 300], [NaN, 100], [0, 500]]) assert.equal(bannerResolutionNotice(w, h), '');
});
