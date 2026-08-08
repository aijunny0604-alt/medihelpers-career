import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('맞춤 헤드헌팅 공고는 모달 대신 공유 가능한 상세 페이지로 열린다', async () => {
  const source = await readFile(new URL('./main.jsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('./styles.css', import.meta.url), 'utf8');

  assert.match(source, /function HeadhuntPostDetailPage/);
  assert.match(source, /navigate\(`\/headhunting\/posts\/\$\{encodeURIComponent\(post\.id\)\}`\)/);
  assert.match(source, /path\.startsWith\('\/headhunting\/posts\/'\)/);
  assert.match(source, /맞춤 헤드헌팅 목록으로/);
  assert.doesNotMatch(source, /function HeadhuntPostModal/);
  assert.match(styles, /\.headhunt-detail-page/);
  assert.match(styles, /\.headhunt-detail-back:focus-visible/);
});
