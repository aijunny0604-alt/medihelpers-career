// Local generated-artifact checks only. Does not deploy or call a payment provider.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import worker from '../dist-cf/server/index.js';
const config = await readFile(new URL('../dist-cf/wrangler.toml', import.meta.url), 'utf8');
const checks = [];
assert.ok(!config.includes('[[r2_buckets]]'), 'free-only generated config must not require R2');
assert.ok(config.includes('D1_UPLOADS_ENABLED = "true"'));
assert.ok(config.includes('D1_RETENTION_ENABLED = "false"'));
checks.push('generated config uses D1 uploads without R2; retention disabled');
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
const staging=JSON.parse((await readFile(new URL('../deploy/cloudflare.staging.jsonc',import.meta.url),'utf8')).replace(/^\s*\/\/.*$/gm,''));
assert.equal(staging.r2_buckets,undefined);
assert.equal(staging.routes,undefined);
const production = JSON.parse(await readFile(new URL('../deploy/cloudflare.production.example.json',import.meta.url),'utf8'));
assert.notEqual(production.name, staging.name);
assert.notEqual(production.d1_databases[0].database_id, staging.d1_databases[0].database_id);
assert.equal(production.vars.SITE_ORIGIN, 'https://www.medihelpers.co.kr');
assert.equal(production.vars.MIGRATION_MODE, 'drain');
assert.equal(production.vars.CHECKOUT_ENABLED, 'false');
assert.equal(production.workers_dev, false);
assert.equal(production.routes, undefined);
assert.equal(production.r2_buckets, undefined);
checks.push('production template isolated from staging and closed until cutover');
assert.equal(staging.vars.STAGING_READ_ONLY,'true');
assert.equal(staging.vars.CHECKOUT_ENABLED,'false');
assert.equal(staging.vars.INICIS_REFUNDS_ENABLED,'false');
assert.equal(staging.vars.INICIS_REFUND_MODE,'manual');
assert.ok(config.includes('INICIS_REFUND_MODE = "manual"'));
assert.ok(config.includes('INICIS_REFUNDS_ENABLED = "false"'));
checks.push('merchant-console refund mode prepared; automatic refunds disabled');
assert.equal(staging.vars.INICIS_SIGN_KEY,undefined);
const staged=await worker.fetch(new Request('https://staging.example.com/robots.txt'),staging.vars,{});
assert.match(await staged.text(),/Disallow: \//);
assert.match(staged.headers.get('x-robots-tag'),/noindex/);
assert.equal((await worker.fetch(new Request('https://staging.example.com/api/payment-approve',{method:'POST'}),staging.vars,{})).status,503);
checks.push('no R2 subscription','no domain route','staging read only','checkout disabled','refund disabled','no plaintext sign key','robots disabled','noindex header','staging approval blocked');
assert.equal(staging.vars.D1_RETENTION_ENABLED,'false');
assert.deepEqual(staging.triggers.crons,['17 * * * *']);
let waited;
const retentionResult=await worker.scheduled({}, {...staging.vars,D1_UPLOADS_ENABLED:'true',D1_RETENTION_ENABLED:'true',DB:{prepare(){throw Error('Read-only scheduled task must not query DB');}}},{waitUntil(p){waited=p;}});
assert.equal(retentionResult.skipped,'read-only-or-maintenance');
assert.deepEqual(await waited,retentionResult);
checks.push('retention disabled','cron schedule packaged','read-only retention skipped','scheduled promise awaited');
console.log(JSON.stringify({ checks, passed:checks.length, deployed:false, livePaymentVerified:false }, null, 2));
