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

test('열람권은 상품 수량만 적립하고 새 인재마다 1건만 원자적으로 차감한다', async () => {
  const serverSource = await readFile(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8');
  assert.match(serverSource, /'talent-unlock-single':\{[^}]*unlockCount:1/);
  assert.match(serverSource, /'talent-unlock-pack':\{[^}]*unlockCount:10/);
  assert.match(serverSource, /'talent-unlock-pack30':\{[^}]*unlockCount:30/);
  assert.match(serverSource, /total_credits, used_credits, expires_at\) VALUES \(\?, \?, \?, \?, 0, \?\)/);
  assert.match(serverSource, /used_credits < total_credits/);
  assert.match(serverSource, /SET used_credits = used_credits \+ 1 WHERE id = \? AND used_credits = \?/);
});

test('같은 인재의 재열람·동시 열람은 크레딧을 중복 차감하지 않는다', async () => {
  const serverSource = await readFile(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8');
  assert.match(serverSource, /idx_talent_unlocks_owner_talent/);
  assert.match(serverSource, /INSERT OR IGNORE INTO talent_unlocks/);
  assert.match(serverSource, /다른 동시 요청이 먼저 같은 인재 권한을 만들었다면/);
  assert.match(serverSource, /SET used_credits = used_credits - 1 WHERE id = \? AND used_credits > 0/);
  assert.match(serverSource, /talentCredits:\{ total:Number\(talentCreditSummary\.total\)\|\|0, used:Number\(talentCreditSummary\.used\)\|\|0, remaining:Number\(talentCreditSummary\.remaining\)\|\|0/);
});
