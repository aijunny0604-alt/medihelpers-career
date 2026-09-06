import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [admin, main, styles] = await Promise.all([
  readFile(new URL('./AdminConsolePage.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./main.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./styles.css', import.meta.url), 'utf8'),
]);

test('관리자 계정은 공개 헤더와 콘솔에서 알림 아이콘·알림창을 사용한다', () => {
  assert.match(main, /관리자 알림 열기/);
  assert.match(main, /admin\/console\?open=notifications/);
  assert.match(admin, /adminNotifications/);
  assert.match(admin, /admin-alert-panel/);
  assert.match(admin, /새 상담 문의/);
  assert.match(admin, /결제 상태 확인 필요/);
});

test('관리자 위젯과 콘텐츠 상세는 큰 카드·한글 필드·이미지 미리보기를 제공한다', () => {
  assert.match(styles, /\.admin-metric-grid\{grid-template-columns:repeat\(3/);
  assert.match(styles, /\.admin-content-detail\{width:min\(1320px/);
  assert.match(admin, /공고·콘텐츠 상세/);
  assert.match(admin, /광고 상품/);
  assert.match(admin, /admin-content-media/);
});
