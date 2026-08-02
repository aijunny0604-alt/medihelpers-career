import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('검색엔진용 robots, sitemap, canonical과 사이트 매니페스트를 제공한다', async () => {
  const [serverSource, html] = await Promise.all([
    readFile(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
  ]);
  assert.match(serverSource, /pathname === '\/robots\.txt'/);
  assert.match(serverSource, /pathname === '\/sitemap\.xml'/);
  assert.match(serverSource, /pathname === '\/manifest\.webmanifest'/);
  assert.match(serverSource, /Sitemap: ' \+ origin \+ '\/sitemap\.xml'/);
  assert.match(serverSource, /htmlDocument\(request\)/);
  assert.match(html, /rel="canonical"/);
  assert.match(html, /name="robots" content="index, follow, max-image-preview:large"/);
  assert.match(html, /rel="manifest"/);
});

test('검색 색인에서 개인정보·관리자·API 경로를 제외한다', async () => {
  const serverSource = await readFile(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8');
  assert.match(serverSource, /Disallow: \/admin/);
  assert.match(serverSource, /Disallow: \/mypage/);
  assert.match(serverSource, /Disallow: \/api\//);
  assert.match(serverSource, /Disallow: \/signup/);
  assert.match(serverSource, /Disallow: \/resume/);
  assert.match(serverSource, /Disallow: \/request\//);
});
