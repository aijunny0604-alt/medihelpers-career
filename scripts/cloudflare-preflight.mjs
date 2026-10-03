// Local generated-artifact checks only. Does not deploy or call a payment provider.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import worker from '../dist-cf/server/index.js';
const config = await readFile(new URL('../dist-cf/wrangler.toml', import.meta.url), 'utf8');
const checks = [];
for (const value of ['run_worker_first = true', 'migrations_dir = "drizzle"', 'TEST_ACCOUNT_SWITCH_ENABLED = "false"', 'PAYMENT_LIVE = "true"', 'SIGNUP_ENABLED = "false"', 'MIGRATION_MODE = "drain"', 'CHECKOUT_ENABLED = "false"']) {
  assert.ok(config.includes(value), value); checks.push(value);
}
const env = { TEST_ACCOUNT_SWITCH_ENABLED:'false', PAYMENT_LIVE:'true', SIGNUP_ENABLED:'false', MIGRATION_MODE:'open' };
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
const staging=JSON.parse((await readFile(new URL('../deploy/cloudflare.staging.jsonc',import.meta.url),'utf8')).replace(/^\s*\/\/.*$/gm,''));
assert.equal(staging.r2_buckets,undefined);
assert.equal(staging.routes,undefined);
assert.equal(staging.vars.STAGING_READ_ONLY,'true');
assert.equal(staging.vars.CHECKOUT_ENABLED,'false');
assert.equal(staging.vars.INICIS_REFUNDS_ENABLED,'false');
assert.equal(staging.vars.INICIS_SIGN_KEY,undefined);
const staged=await worker.fetch(new Request('https://staging.example.com/robots.txt'),staging.vars,{});
assert.match(await staged.text(),/Disallow: \//);
assert.match(staged.headers.get('x-robots-tag'),/noindex/);
assert.equal((await worker.fetch(new Request('https://staging.example.com/api/payment-approve',{method:'POST'}),staging.vars,{})).status,503);
console.log('Free-only staging configuration and noindex verified (9 assertions).');
assert.equal(staging.vars.D1_RETENTION_ENABLED,'false');
assert.deepEqual(staging.triggers.crons,['17 * * * *']);
let waited;
const retentionResult=await worker.scheduled({}, {...staging.vars,D1_UPLOADS_ENABLED:'true',D1_RETENTION_ENABLED:'true',DB:{prepare(){throw Error('Read-only scheduled task must not query DB');}}},{waitUntil(p){waited=p;}});
assert.equal(retentionResult.skipped,'read-only-or-maintenance');
assert.deepEqual(await waited,retentionResult);
console.log('Scheduled retention packaging and read-only guard verified (4 assertions).');
