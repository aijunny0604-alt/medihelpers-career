import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('회원정보 API는 스키마 확인을 캐시하고 전체 D1 조회를 한 번에 실행한다', async () => {
  const server = await readFile(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8');

  assert.match(server, /const schemaReadyPromises = new Map\(\)/);
  assert.match(server, /SELECT 1 FROM job_seeker_posts LIMIT 1/);
  assert.match(server, /Promise\.all\(\[ensureAccountSchema\(env\), ensureConsultationSchema\(env\), ensureMemberCenterSchema\(env\), ensureCommerceSchema\(env\), ensureTalentCreditSchema\(env\)\]\)/);
  assert.match(server, /addQuery\('profile', env\.DB\.prepare/);
  assert.match(server, /addQuery\('orders', env\.DB\.prepare/);
  assert.match(server, /addQuery\('messages', env\.DB\.prepare/);
  assert.match(server, /addQuery\('talentCredits', env\.DB\.prepare/);
  assert.match(server, /const queryResults = await env\.DB\.batch\(queryStatements\)/);
  assert.match(server, /const resultsByName = new Map/);
});
