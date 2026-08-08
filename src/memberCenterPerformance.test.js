import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('회원정보 API는 스키마 확인을 캐시하고 독립 D1 조회를 병렬 실행한다', async () => {
  const server = await readFile(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8');

  assert.match(server, /const schemaReadyPromises = new Map\(\)/);
  assert.match(server, /SELECT 1 FROM inquiry_messages LIMIT 1/);
  assert.match(server, /Promise\.all\(\[ensureAccountSchema\(env\), ensureConsultationSchema\(env\), ensureMemberCenterSchema\(env\), ensureCommerceSchema\(env\)\]\)/);
  assert.match(server, /const profileRequest = env\.DB\.prepare/);
  assert.match(server, /const ordersRequest = env\.DB\.prepare/);
  assert.match(server, /const messagesRequest = env\.DB\.prepare/);
  assert.match(server, /await Promise\.all\(\[\s*profileRequest, preferencesRequest, activityRequest, consultationsRequest, ordersRequest/s);
});
