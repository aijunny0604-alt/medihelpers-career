import test from 'node:test';
import assert from 'node:assert/strict';
import { migrationControl, migrationGate } from './migrationGate.js';
const req = (path, method='GET', headers={}) => new Request('https://example.invalid'+path,{method,headers});
test('free staging allows viewing but blocks all mutations including PG returns',async()=>{
  const env={STAGING_READ_ONLY:'true',MIGRATION_MODE:'open',CHECKOUT_ENABLED:'false'};
  assert.equal(migrationGate(req('/'),env),null);
  for(const path of ['/api/auth/login','/api/auth/register','/api/uploads','/api/payment-orders','/api/payment-approve','/api/admin-refund-review']) {
    const response=migrationGate(req(path,'POST'),env);
    assert.equal(response.status,503);assert.equal((await response.json()).code,'STAGING_READ_ONLY');
  }
});
test('default mode preserves existing service; checkout pause only stops new orders', () => {
  assert.deepEqual(migrationControl(),{mode:'open',checkoutEnabled:true});
  assert.equal(migrationGate(req('/api/payment-orders','POST')),null);
  for (const value of ['false','typo','0','']) assert.equal(migrationGate(req('/api/payment-orders','POST'),{CHECKOUT_ENABLED:value}).status,503);
  for (const path of ['/api/payment-approve','/api/resumes','/api/auth/login']) assert.equal(migrationGate(req(path,'POST'),{CHECKOUT_ENABLED:'false'}),null);
});
for (const mode of ['drain','frozen','misspelled']) {
  for (const [path,method] of [['/api/account','GET'],['/api/talent-detail/ABC','GET'],['/api/admin-backups','GET'],['/api/uploads/image.png','GET'],['/api/job-seeker-posts/ABC','PATCH'],['/api/resumes','DELETE'],['/api/auth/login','POST'],['/api/payment-orders','POST'],['/api/new-write-route','POST']]) {
    test(`${mode} blocks ${method} ${path} including privileged bypass attempts`,async()=>{
      const r=migrationGate(req(path+'?MIGRATION_MODE=open',method,{'x-admin':'true',cookie:'role=admin'}),{MIGRATION_MODE:mode});
      assert.equal(r.status,503);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('retry-after'),'300');assert.equal((await r.json()).code,'MIGRATION_MAINTENANCE');
    });
  }
}
test('only drain allows existing POST approval handler, never a success shortcut',()=>{
  assert.equal(migrationGate(req('/api/payment-approve','POST'),{MIGRATION_MODE:'drain'}),null);
  for(const path of ['/api/payment-approve/','/api/payment-approve/fake']) assert.equal(migrationGate(req(path,'POST'),{MIGRATION_MODE:'drain'}).status,503);
  assert.equal(migrationGate(req('/api/payment-approve','GET'),{MIGRATION_MODE:'drain'}).status,503);
  assert.equal(migrationGate(req('/api/payment-approve','POST'),{MIGRATION_MODE:'frozen'}).status,503);
});
test('maintenance page and read-only status need no storage',async()=>{
  assert.match(await migrationGate(req('/jobs','GET'),{MIGRATION_MODE:'drain'}).text(),/서비스 이전/);
  assert.equal(await migrationGate(req('/','HEAD'),{MIGRATION_MODE:'frozen'}).text(),'');
  const status=migrationGate(req('/api/service-status'),{MIGRATION_MODE:'drain',SECRET:'not-to-leak'});
  assert.deepEqual(await status.json(),{mode:'drain',checkoutEnabled:false});
  assert.equal(migrationGate(req('/api/service-status','POST')).status,405);
});
