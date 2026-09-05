import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('공고 상세 지도는 현재 페이지에서 펼치고 접을 수 있다', async () => {
  const [main, map, styles, server] = await Promise.all([
    read('./main.jsx'), read('./JobLocationMap.jsx'), read('./styles.css'), read('../scripts/package-sites.mjs'),
  ]);
  assert.match(main, /const \[mapOpen, setMapOpen\] = useState\(false\)/);
  assert.match(main, /페이지에서 지도 보기/);
  assert.match(main, /aria-expanded=\{mapOpen\}/);
  assert.match(map, /if \(!query \|\| !open\) return null/);
  assert.match(map, /output=embed/);
  assert.match(map, /네이버지도에서 크게 보기/);
  assert.match(styles, /\.job-location-embed\{display:block/);
  assert.match(server, /frame-src[^"\n]*https:\/\/www\.google\.com/);
});
