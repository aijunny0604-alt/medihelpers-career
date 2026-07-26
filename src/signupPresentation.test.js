import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('회원가입 화면에서 설명성 안내 배너를 렌더하지 않는다', async () => {
  const source = await readFile(new URL('./AccountPage.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /hospital-verification-note/);
  assert.doesNotMatch(source, /signup-no-marketing/);
  assert.doesNotMatch(source, /signup-security-copy/);
  assert.doesNotMatch(source, /signup-launch-boundary/);
});

test('주소 검색 모달은 넓은 반응형 패널과 접근 가능한 닫기를 제공한다', async () => {
  const source = await readFile(new URL('./AccountPage.jsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('./styles.css', import.meta.url), 'utf8');
  assert.match(source, /aria-modal/);
  assert.match(source, /event\.key === 'Escape'/);
  assert.match(styles, /\.address-search-panel\{width:min\(720px,100%\);height:min\(720px,calc\(100vh - 48px\)\)/);
  assert.match(styles, /backdrop-filter:blur\(10px\)/);
  assert.match(styles, /100dvh/);
});
