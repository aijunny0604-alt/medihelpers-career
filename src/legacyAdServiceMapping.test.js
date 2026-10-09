import test from 'node:test';
import assert from 'node:assert/strict';
import {mapLegacyAdService} from './legacyAdServiceMapping.js';
const record=(extra={})=>({id:'rankup-job-1',status:'draft',visibility:'admin',payloadJson:JSON.stringify({migration:{ownerMapping:{accountId:'synthetic'}},...extra})});
const obs=row=>({sourceId:'1',row});
test('preserves dated service and Korean end date without a new order',()=>{
 const r=mapLegacyAdService(record(),obs('\t프리미엄로고 : 2026.07.17~2027.01.17\n아이콘 : 무기한'));
 assert.equal(r.exposureEnd,'2027-01-17');assert.equal(r.exposure.start,'2026-07-17');assert.equal(r.migration.legacyAdService.newCharge,false);
});
test('preserves unlimited setting without inventing an expiry',()=>{
 const r=mapLegacyAdService(record(),obs('프리미엄배너 : 무기한'));
 assert.equal(r.exposureEnd,'');assert.equal(r.exposure,undefined);assert.equal(r.migration.legacyAdService.unlimited,true);
});
test('rejects published records and missing ownership',()=>{
 assert.throws(()=>mapLegacyAdService({...record(),status:'published'},obs('프리미엄배너 : 무기한')));
 assert.throws(()=>mapLegacyAdService(record({migration:{}}),obs('프리미엄배너 : 무기한')));
});
test('does not overwrite an existing edited service',()=>assert.throws(()=>mapLegacyAdService(record({adTier:'basic'}),obs('프리미엄배너 : 무기한'))));
test('rejects impossible reversed missing or ambiguous periods',()=>{
 for(const row of ['프리미엄로고 : 2026.02.30~2027.01.17','프리미엄로고 : 2027.01.17~2026.07.17','프리미엄로고 :','프리미엄배너 : 무기한\n프리미엄우대 : 무기한'])assert.throws(()=>mapLegacyAdService(record(),obs(row)));
});
