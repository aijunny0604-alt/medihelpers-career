// Local generated-artifact checks only. Does not deploy or call a payment provider.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import worker from '../dist-cf/server/index.js';
const config = await readFile(new URL('../dist-cf/wrangler.toml', import.meta.url), 'utf8');
const checks = [];
for (const value of ['run_worker_first = true', 'migrations_dir = "drizzle"', 'TEST_ACCOUNT_SWITCH_ENABLED = "false"', 'PAYMENT_LIVE = "true"', 'SIGNUP_ENABLED = "false"']) {
  assert.ok(config.includes(value), value); checks.push(value);
}
const env = { TEST_ACCOUNT_SWITCH_ENABLED:'false', PAYMENT_LIVE:'true', SIGNUP_ENABLED:'false' };
for (const pathname of ['/', '/jobs', '/sitemap.xml', '/robots.txt']) {
  const response = await worker.fetch(new Request('https://www.medihelpers.co.kr' + pathname), env, {});
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.ok(body.includes('https://www.medihelpers.co.kr'));
  assert.ok(!body.includes('https://medihelpers-career.junnyai.chatgpt.site'));
  if (pathname === '/' || pathname === '/jobs') assert.match(response.headers.get('cache-control'), /no-store/);
  checks.push(pathname);
}
const post = (pathname, body) => worker.fetch(new Request('https://www.medihelpers.co.kr' + pathname, {
  method:'POST', headers:{'content-type':'application/json', origin:'https://www.medihelpers.co.kr'}, body:JSON.stringify(body)
}), env, {});
assert.notEqual((await post('/api/auth/test-switch', {key:'admin'})).status, 200);
assert.equal((await post('/api/payment-approve', {})).status, 503);
checks.push('test admin disabled', 'missing PG keys fail closed');
console.log(JSON.stringify({ checks, passed:checks.length, deployed:false, livePaymentVerified:false }, null, 2));
