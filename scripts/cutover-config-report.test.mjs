import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectCutover} from './cutover-config-report.mjs';
import {readFileSync} from 'node:fs';
const base={workers_dev:false,routes:[{pattern:'www.medihelpers.co.kr',custom_domain:true},{pattern:'medihelpers.co.kr',custom_domain:true}],vars:{MIGRATION_MODE:'open',STAGING_READ_ONLY:'false',CHECKOUT_ENABLED:'false'}};
test('prepared routes do not claim payment verification',()=>{const r=inspectCutover(base);assert.equal(r.configurationReady,true);assert.equal(r.checkoutEnabled,false);assert.equal(r.deploymentPerformed,false);});
test('disabled workers.dev and absent routes is unreachable',()=>assert(inspectCutover({...base,routes:[]}).blockers.includes('no-public-entrypoint')));
test('www only does not cover apex',()=>assert(inspectCutover({...base,routes:[base.routes[0]]}).blockers.includes('missing-route:medihelpers.co.kr')));
test('lookalike host is rejected',()=>assert(inspectCutover({...base,routes:['www.medihelpers.co.kr.example.com/*']}).blockers.includes('missing-route:www.medihelpers.co.kr')));
test('read only and drain block ordinary operation',()=>assert.deepEqual(inspectCutover({...base,vars:{MIGRATION_MODE:'drain',STAGING_READ_ONLY:'true'}}).blockers,['migration-not-open','read-only']));
test('explicit host route patterns accepted',()=>assert.equal(inspectCutover({...base,routes:['www.medihelpers.co.kr/*','medihelpers.co.kr/*']}).configurationReady,true));
test('actual cutover candidate connects both hosts but retains maintenance',()=>{
 const c=JSON.parse(readFileSync(new URL('../deploy/cloudflare.cutover.json',import.meta.url)));
 assert.deepEqual(inspectCutover(c).blockers,['migration-not-open','read-only']);
 assert(c.routes.every(r=>r.custom_domain===true));assert.equal(c.name,'medihelpers-staging');
 assert.equal(c.vars.CHECKOUT_ENABLED,'false');assert.equal(c.vars.TEST_ACCOUNT_SWITCH_ENABLED,'false');
 assert.equal(c.vars.D1_UPLOADS_ENABLED,undefined);
 assert.equal(c.d1_databases[0].database_id,'ef6090da-544c-446f-bd31-32b631b2d2d6');
});
test('rollback explicitly clears domains and restores staging binding',()=>{
 const c=JSON.parse(readFileSync(new URL('../deploy/cloudflare.rollback.json',import.meta.url)));
 assert.deepEqual(c.routes,[]);assert.equal(c.workers_dev,true);assert.equal(c.name,'medihelpers-staging');
 assert.equal(c.d1_databases[0].database_id,'f29e16f1-c8b3-4151-96ce-be2239e4c3ce');
 assert.equal(c.vars.CHECKOUT_ENABLED,'false');
});

// Exercise the real request gate with the candidate, not just its field names.
test('unapplied opening candidate serves pages while denying new purchases', async()=>{
 const {migrationGate}=await import('../src/migrationGate.js');
 const c=JSON.parse(readFileSync(new URL('../deploy/cloudflare.open-without-checkout.json',import.meta.url)));
 assert.equal(inspectCutover(c).configurationReady,true);
 assert.equal(c.vars.SIGNUP_ENABLED,'false');
 assert.equal(c.vars.TEST_ACCOUNT_SWITCH_ENABLED,'false');
 assert.equal(c.vars.INICIS_ENV,'test');
 assert.equal(c.vars.INICIS_REFUNDS_ENABLED,'false');
 assert.equal(c.vars.STAGING_NOINDEX,'true');
 assert.equal(c.d1_databases[0].database_id,'ef6090da-544c-446f-bd31-32b631b2d2d6');
 assert.equal(migrationGate(new Request('https://www.medihelpers.co.kr/jobs'),c.vars),null);
 assert.equal(migrationGate(new Request('https://www.medihelpers.co.kr/api/auth/login',{method:'POST'}),c.vars),null);
 const blocked=migrationGate(new Request('https://www.medihelpers.co.kr/api/payment-orders',{method:'POST'}),c.vars);
 assert.equal(blocked.status,503);assert.equal((await blocked.json()).code,'CHECKOUT_PAUSED');
});
