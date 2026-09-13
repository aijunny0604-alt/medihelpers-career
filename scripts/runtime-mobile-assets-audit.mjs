// Verify the actual packaged Worker: split-route assets must never fall through
// to SPA HTML, disappear from the package, or accidentally serve internal files.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import worker from '../dist/server/index.js';

const result = [];
function check(name, actual, expected) { assert.deepEqual(actual, expected, name); result.push(name); }
const call = path => worker.fetch(new Request('https://mobile-audit.local' + path), {}, {});
const html = await (await call('/')).text();
const assetLinks = html => [...html.matchAll(/(?:src|href)="(\/assets\/[^"\s]+)"/g)].map(m => m[1]);
const assetFiles = (await readdir(new URL('../client-build/assets/', import.meta.url))).filter(n => /\.(js|css)$/.test(n));
for (const name of assetFiles) {
  const response = await call('/assets/' + name);
  check(name + ' status', response.status, 200);
  check(name + ' content', await response.text(), await readFile(new URL('../client-build/assets/' + name, import.meta.url), 'utf8'));
  check(name + ' MIME', response.headers.get('content-type'), name.endsWith('.js') ? 'application/javascript; charset=utf-8' : 'text/css; charset=utf-8');
  check(name + ' immutable', response.headers.get('cache-control'), 'public, max-age=31536000, immutable');
}
for (const path of ['/assets/missing-route.js', '/assets/constructor', '/assets/__proto__', '/src/accountApi.js', '/docs/STATUS.md']) {
  check(path + ' not exposed', (await call(path)).status, 404);
}
for (const path of ['/signup/hospital', '/resume', '/mypage', '/admin']) {
  const response = await call(path);
  check(path + ' direct entry', response.status, 200);
  check(path + ' current assets', assetLinks(await response.text()), assetLinks(html));
  check(path + ' no-store', response.headers.get('cache-control').includes('no-store'), true);
}
const entryFiles = [...html.matchAll(/(?:src|href)="(\/assets\/[^"\s]+\.js)"/g)].map(m => m[1]);
const entrySources = await Promise.all([...new Set(entryFiles)].map(async path => {
  const source = await (await call(path)).text();
  return { path, bytes:Buffer.byteLength(source), gzip:gzipSync(source).length };
}));
check('initial JS below 500KB', entrySources.reduce((n,s) => n+s.bytes,0) < 500000, true);
console.log(JSON.stringify({ checks:result.length, failed:[], assetCount:assetFiles.length, initialJS:entrySources }, null, 2));
