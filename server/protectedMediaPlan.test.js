import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {applyProtectedMediaPlan} from '../scripts/lib/protected-media-plan.mjs';
function fixture(){
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE admin_content_records(id TEXT PRIMARY KEY,payload_json TEXT,subtitle TEXT,status TEXT,visibility TEXT)');
 const changes=[1,2].map(i=>{
  const expectedPayloadJson=JSON.stringify({migration:{ownerMapping:{accountId:'owner-'+i}},price:1000});
  const payloadJson=JSON.stringify({...JSON.parse(expectedPayloadJson),logo:'/legacy-media/example.png'});
  const c={id:'rankup-job-'+i,expectedPayloadJson,payloadJson,expectedSubtitle:null,subtitle:'Synthetic hospital'};
  db.prepare("INSERT INTO admin_content_records VALUES (?,?,NULL,'draft','admin')").run(c.id,c.expectedPayloadJson);return c;
 });
 const state=()=>db.prepare('SELECT * FROM admin_content_records ORDER BY id').all();return {db,changes,state};
}
test('protected media apply and rollback restore exact rows including null subtitle',()=>{
 const {db,changes,state}=fixture(),before=state();applyProtectedMediaPlan(db,changes);
 assert.equal(state()[0].subtitle,'Synthetic hospital');assert.equal(state()[0].status,'draft');
 applyProtectedMediaPlan(db,changes,true);assert.deepEqual(state(),before);db.close();
});
test('late apply conflict rolls back earlier rows without losing an external edit',()=>{
 const {db,changes,state}=fixture();db.exec("UPDATE admin_content_records SET subtitle='external' WHERE id='rankup-job-2'");
 const before=state();assert.throws(()=>applyProtectedMediaPlan(db,changes),/conflict/);assert.deepEqual(state(),before);db.close();
});
test('rollback refuses to overwrite newly published content and remains atomic',()=>{
 const {db,changes,state}=fixture();applyProtectedMediaPlan(db,changes);db.exec("UPDATE admin_content_records SET status='published' WHERE id='rankup-job-2'");
 const before=state();assert.throws(()=>applyProtectedMediaPlan(db,changes,true),/conflict/);assert.deepEqual(state(),before);db.close();
});
test('plan rejects owner or business field changes, duplicate IDs, and unresolved owners before writes',()=>{
 for(const mutate of [c=>{c[1].payloadJson=JSON.stringify({...JSON.parse(c[1].payloadJson),price:0});},c=>{const p=JSON.parse(c[1].payloadJson);p.migration.ownerMapping.accountId='attacker';c[1].payloadJson=JSON.stringify(p);},c=>{c.push(c[0]);},c=>{c[1].expectedPayloadJson='{}';}]){
  const {db,changes,state}=fixture(),before=state();mutate(changes);assert.throws(()=>applyProtectedMediaPlan(db,changes));assert.deepEqual(state(),before);db.close();
 }
});
