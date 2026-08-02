import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('기존 D1 결제 스키마에서도 인재 열람권 주문 유형을 호환 저장한다', async () => {
  const serverSource = await readFile(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8');
  assert.match(serverSource, /async function paymentStorageType/);
  assert.match(serverSource, /sqlite_master[^\n]+payment_orders/);
  assert.match(serverSource, /return 'membership'/);
  assert.match(serverSource, /product_id LIKE 'talent-unlock-%' THEN 'talent_search'/);
  assert.match(serverSource, /account\.id, storedProductType/);
});

test('가상 결제 승인 실패를 성공 화면으로 넘기지 않는다', async () => {
  const mainSource = await readFile(new URL('./main.jsx', import.meta.url), 'utf8');
  assert.match(mainSource, /!approve\.ok \|\| !approveResult\.approved/);
  assert.match(mainSource, /가상 결제로 열람권 활성화/);
  assert.match(mainSource, /실제 카드나 계좌에서 금액이 청구되지 않으며/);
});
