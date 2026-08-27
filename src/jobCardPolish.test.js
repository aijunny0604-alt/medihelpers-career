import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('유료 채용공고 카드는 두꺼운 상단 색 띠 없이 배지로 등급을 구분한다', async () => {
  const styles = await readFile(new URL('./styles.css', import.meta.url), 'utf8');
  const start = styles.indexOf('/* 유료 등급은 두꺼운 색 띠 없이 배지와 표면 농도로 구분한다. */');
  const end = styles.indexOf('/* Hospital-owned recruitment ad editor */', start);
  const tierStyles = styles.slice(start, end);

  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  assert.match(tierStyles, /\.job-card\[data-ad-tier\]\{border-top-width:1px!important\}/);
  assert.match(tierStyles, /\.ad-tier-badge\.ad-tier-main\{[^}]*background:#fff5d9!important/);
  assert.match(tierStyles, /\.ad-tier-badge\.ad-tier-basic\{[^}]*background:#edf5ff!important/);
  assert.doesNotMatch(tierStyles, /border-top(?:-width)?:[2-9]px/);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)\{[\s\S]*?\.job-card\.premium-ad:hover\{transform:none!important\}/);
});

test('공고 등록 자유서식은 상세내용으로 표시한다', async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL('./main.jsx', import.meta.url), 'utf8'),
    readFile(new URL('./styles.css', import.meta.url), 'utf8'),
  ]);

  assert.match(source, /상세내용 <i>선택<\/i>/);
  const retiredLabel = ['상세', '모집요강'].join(' ');
  assert.equal(source.includes(retiredLabel), false);
  assert.equal(styles.includes(retiredLabel), false);
});

test('모바일 채용 바로가기 바는 브랜드 문구를 글자 단위로 쪼개지 않는다', async () => {
  const styles = await readFile(new URL('./styles.css', import.meta.url), 'utf8');

  assert.match(styles, /@media\(max-width:620px\)\{[\s\S]*?\.smart-ad-dock-brand strong\{[^}]*text-overflow:ellipsis[^}]*white-space:nowrap/);
  assert.match(styles, /@media\(max-width:420px\)\{[\s\S]*?\.smart-ad-dock-brand span\{display:none\}/);
});
