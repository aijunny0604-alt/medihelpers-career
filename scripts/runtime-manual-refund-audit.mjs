import { PRIVACY_FORM_VERSION } from '../src/privacyConsent.js';
import assert from 'node:assert/strict';
// Run after npm run build. Exercises the generated Worker with an isolated in-memory SQLite DB.
import { DatabaseSync } from 'node:sqlite';
import { readFile, readdir } from 'node:fs/promises';
import worker from '../dist/server/index.js';

const sqlite = new DatabaseSync(':memory:');
for(const file of (await readdir(new URL('../drizzle/',import.meta.url))).filter(x=>x.endsWith('.sql')).sort()) sqlite.exec(await readFile(new URL('../drizzle/'+file,import.meta.url),'utf8'));
const sqlErrors=[];
class Statement {
  constructor(sql,args=[]) { this.sql=sql; this.args=args; }
  bind(...args) { return new Statement(this.sql,args); }
  async all() { try { return {results:sqlite.prepare(this.sql).all(...this.args),success:true}; } catch(e) {sqlErrors.push(e.message); throw e;} }
  async first(column) { const row=(await this.all()).results[0]||null; return column ? row?.[column] : row; }
  async run() { try {const r=sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}};}catch(e){sqlErrors.push(e.message);throw e;} }
}
let injectedFailure = null;
let beforeStatement = null;
function execute(statement, read=false) {
 if(beforeStatement?.pattern.test(statement.sql)) {const callback=beforeStatement.run;beforeStatement=null;callback();}
 if(injectedFailure?.test(statement.sql)) {injectedFailure=null; throw new Error('INJECTED_DB_FAILURE');}
 if(read)return {results:sqlite.prepare(statement.sql).all(...statement.args),success:true};
 const r=sqlite.prepare(statement.sql).run(...statement.args);return {success:true,meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}};
}
Statement.prototype.all=async function(){return execute(this,true)};
Statement.prototype.run=async function(){return execute(this)};
let readBarrier=null;
Statement.prototype.first=async function(column){
 const row=(await this.all()).results[0]||null;
 if(readBarrier?.pattern.test(this.sql)) {
  const b=readBarrier;b.count++;
  if(b.count===b.target)b.release();else await b.promise;
 }
 return column?row?.[column]:row;
};
const DB={prepare:sql=>new Statement(sql),batch:async statements=>{sqlite.exec('BEGIN');try{const r=statements.map(s=>execute(s,/^\s*(SELECT|PRAGMA)/i.test(s.sql)));sqlite.exec('COMMIT');return r;}catch(e){sqlite.exec('ROLLBACK');throw e;}},exec:async sql=>sqlite.exec(sql)};
const env={DB,ACCOUNT_HASH_SECRET:'audit-only-secret-never-used-outside-local-20260909',ADMIN_EMAILS:'admin@medihelpers.co.kr',SIGNUP_ENABLED:'true',LEGAL_DOCUMENT_STATUS:'approved',TEST_ACCOUNT_SWITCH_ENABLED:'true'};
const output=[];
async function call(path,role='',body,method=body?'POST':'GET') {
 // Existing positive fixtures explicitly represent a visitor accepting the current notices.
 // Negative consent cases override these values with false/null.
 if(body && typeof body === 'object' && !Array.isArray(body)) body={privacyVersion:PRIVACY_FORM_VERSION,privacyConsent:true,publicationAcknowledged:true,checkoutAcknowledged:true,contactConsent:true,...body};
 const headers={'content-type':'application/json',origin:'https://audit.local'};if(cookies[role])headers.cookie=cookies[role];
 const response=await worker.fetch(new Request('https://audit.local'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})}),env,{});
 let data;try{data=await response.json();}catch{data={};}
 return {status:response.status,data,cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
const cookies={};
function record(name,actual,expected){output.push({name,pass:actual===expected,actual,expected});}
for(const role of ['doctor','hospital','admin']){const r=await call('/api/auth/test-switch','',{key:role});cookies[role]=r.cookie;record('local login '+role,r.status,200);}

// Warm shared schema without bypassing the real Worker routes.
await call('/api/member-center','hospital');
await call('/api/admin-console','admin');

const manualEnv={...env,INICIS_REFUND_MODE:'manual',INICIS_REFUNDS_ENABLED:'false'};
let pgCalls=0;
const originalFetch=globalThis.fetch;
globalThis.fetch=async()=>{pgCalls++;throw Error('Unexpected provider request');};
let serial=0;
async function fixture() {
 const created=await call('/api/payment-orders','hospital',{productId:'talent-unlock-pack'});
 const order=created.data.order;
 assert.ok(order);
 assert.equal((await call('/api/payment-approve','hospital',{orderNumber:order.orderNumber})).status,200);
 const tid=('SYNTHETIC'+String(++serial).padStart(31,'0'));
 sqlite.prepare("UPDATE payment_transactions SET provider='inicis',provider_transaction_id=? WHERE order_id=? AND transaction_type='capture'").run(tid,order.id);
 const id='manual-'+serial;
 sqlite.prepare("INSERT INTO payment_refunds(id,order_id,amount,reason) VALUES (?,?,?,'synthetic request')").run(id,order.id,order.totalAmount);
 return {id,order,body:{refundId:id,decision:'record_external',evidence:{tid,amount:order.totalAmount,canceledAt:new Date().toISOString(),reference:'synthetic merchant-console cancellation record',confirmed:true}}};
}
async function submit(f,{role='admin',body=f.body,config=manualEnv,origin='https://audit.local'}={}) {
 const response=await worker.fetch(new Request('https://audit.local/api/admin-refund-review',{method:'POST',headers:{cookie:cookies[role]||'',origin,'content-type':'application/json'},body:JSON.stringify(body)}),config,{});
 return {status:response.status,data:await response.json()};
}
const state=f=>({order:sqlite.prepare('SELECT status FROM payment_orders WHERE id=?').get(f.order.id).status,
 refund:sqlite.prepare('SELECT status FROM payment_refunds WHERE id=?').get(f.id).status,
 refunds:sqlite.prepare("SELECT COUNT(*) n FROM payment_transactions WHERE order_id=? AND transaction_type='refund'").get(f.order.id).n,
 credits:sqlite.prepare('SELECT SUM(used_credits) n FROM talent_credit_pools WHERE order_id=?').get(f.order.id).n,
 claim:sqlite.prepare('SELECT status FROM payment_pg_refunds WHERE order_id=?').get(f.order.id)?.status||null});
const f=await fixture();
const pool=sqlite.prepare('SELECT id,hospital_account_id FROM talent_credit_pools WHERE order_id=?').get(f.order.id);
sqlite.prepare("INSERT INTO talent_unlocks(id,hospital_account_id,talent_id,order_id) VALUES ('manual-used-credit',?,'synthetic-person',?)").run(pool.hospital_account_id,pool.id);
sqlite.prepare("INSERT INTO talent_unlocks(id,hospital_account_id,talent_id,order_id) VALUES ('manual-direct',?,'synthetic-person-2',?)").run(pool.hospital_account_id,f.order.id);
sqlite.prepare("INSERT INTO admin_content_records(id,content_type,title,status) VALUES ('manual-ad','doctor_job','Synthetic ad','published')").run();
sqlite.prepare("UPDATE payment_orders SET metadata_json=? WHERE id=?").run(JSON.stringify({contentRecordId:'manual-ad',exposure:{start:'2026-01-01',end:'2099-12-31'},preserve:'value'}),f.order.id);
for(const role of ['','hospital','doctor'])record('manual refund rejects '+(role||'anonymous'),(await submit(f,{role})).status,403);
record('cross-origin blocked',(await submit(f,{origin:'https://untrusted.example'})).status,403);
record('manual mode opt-in required',(await submit(f,{config:env})).status,503);
record('staging read-only blocks attestation',(await submit(f,{config:{...manualEnv,STAGING_READ_ONLY:'true'}})).status,503);
record('automatic and manual configuration cannot overlap',(await submit(f,{config:{...manualEnv,INICIS_REFUNDS_ENABLED:'true'}})).status,503);
for(const evidence of [{tid:'wrong'},{amount:1},{amount:String(f.order.totalAmount)},{confirmed:false},{canceledAt:'invalid'},{canceledAt:'2999-01-01'},{reference:'x'}]) {
 record('invalid evidence '+Object.keys(evidence)[0],(await submit(f,{body:{...f.body,evidence:{...f.body.evidence,...evidence}}})).status,400);
}
record('failed validation leaves payment paid',state(f).order,'paid');
record('failed validation leaves credits usable',state(f).credits,0);
record('cancellation before approval rejected',(await submit(f,{body:{...f.body,evidence:{...f.body.evidence,canceledAt:'2001-01-01T00:00:00Z'}}})).status,409);
const beforeConsole=await worker.fetch(new Request('https://audit.local/api/admin-console',{headers:{cookie:cookies.admin}}),manualEnv,{});
record('unprocessed refund has no confirmation display',(await beforeConsole.json()).refunds.find(x=>x.id===f.id).manualConfirmation,null);
const outcome=await submit(f);
record('external cancellation attestation saved',outcome.status,200);
record('response distinguishes operator attestation',outcome.data.verification,'operator_attestation');
record('order refunded',state(f).order,'refunded');
record('refund succeeded',state(f).refund,'succeeded');
record('credits revoked',state(f).credits,10);
record('single refund ledger row',state(f).refunds,1);
record('separate manual claim status',state(f).claim,'manual_completed');
record('used credit and direct unlocks revoked',sqlite.prepare("SELECT COUNT(*) n FROM talent_unlocks WHERE id IN ('manual-used-credit','manual-direct')").get().n,0);
record('ad hidden after refund',sqlite.prepare("SELECT status FROM admin_content_records WHERE id='manual-ad'").get().status,'hidden');
record('exposure cleared',JSON.parse(sqlite.prepare('SELECT metadata_json FROM payment_orders WHERE id=?').get(f.order.id).metadata_json).exposure,undefined);
record('unrelated metadata preserved',JSON.parse(sqlite.prepare('SELECT metadata_json FROM payment_orders WHERE id=?').get(f.order.id).metadata_json).preserve,'value');
const consoleResult=await worker.fetch(new Request('https://audit.local/api/admin-console',{headers:{cookie:cookies.admin}}),manualEnv,{});
const consoleData=await consoleResult.json();
record('admin receives manual mode',consoleData.inicisRefundMode,'manual');
record('admin can review retained evidence',consoleData.refunds.find(x=>x.id===f.id)?.manualConfirmation?.verification,'operator_attestation');
const event=sqlite.prepare("SELECT actor_key,detail_json FROM payment_events WHERE order_id=? AND event_type='inicis_manual_refund_recorded'").get(f.order.id);
record('actor retained',Boolean(event.actor_key),true);
record('evidence retained',JSON.parse(event.detail_json).reference,f.body.evidence.reference);
record('repeat rejected',(await submit(f)).status,409);
record('repeat cannot duplicate ledger',state(f).refunds,1);
const fail=await fixture();
injectedFailure=/INSERT INTO payment_events/;
record('audit write failure rejected',(await submit(fail)).status,409);
record('batch rollback preserves paid order',state(fail).order,'paid');
record('batch rollback preserves requested refund',state(fail).refund,'requested');
record('batch rollback preserves credits',state(fail).credits,0);
record('batch rollback removes claim',state(fail).claim,null);
record('batch rollback removes transaction',state(fail).refunds,0);
record('safe retry after rollback succeeds',(await submit(fail)).status,200);
const racing=await fixture();
const outcomes=await Promise.all([submit(racing),submit(racing),submit(racing)]);
record('concurrent submissions commit once',outcomes.filter(x=>x.status===200).length,1);
record('concurrent submissions produce one ledger row',state(racing).refunds,1);
const blocked=await fixture();
sqlite.prepare("INSERT INTO payment_pg_refunds(order_id,refund_id,status) VALUES (?,?,'review')").run(blocked.order.id,blocked.id);
record('ambiguous existing PG attempt blocks manual write',(await submit(blocked)).status,409);
record('ambiguous PG attempt retains paid order',state(blocked).order,'paid');
const partial=await fixture();
sqlite.prepare('UPDATE payment_refunds SET amount=1 WHERE id=?').run(partial.id);
record('partial requested amount blocked atomically',(await submit(partial)).status,409);
record('partial mismatch retains order',state(partial).order,'paid');
const rejected=await fixture();
beforeStatement={pattern:/INSERT INTO payment_pg_refunds/,run:()=>sqlite.prepare("UPDATE payment_refunds SET status='rejected' WHERE id=?").run(rejected.id)};
record('concurrent rejection blocks stale attestation',(await submit(rejected)).status,409);
record('stale attestation cannot revoke credits',state(rejected).credits,0);
const sibling=await fixture(),other=await fixture();
sqlite.prepare("INSERT INTO admin_content_records(id,content_type,title,status) VALUES ('manual-shared-ad','doctor_job','Synthetic shared ad','published')").run();
for(const x of [sibling,other])sqlite.prepare('UPDATE payment_orders SET metadata_json=? WHERE id=?').run(JSON.stringify({contentRecordId:'manual-shared-ad',exposure:{end:'2099-12-31'}}),x.order.id);
record('one of two ad orders refunded',(await submit(sibling)).status,200);
record('other paid order keeps ad visible',sqlite.prepare("SELECT status FROM admin_content_records WHERE id='manual-shared-ad'").get().status,'published');
record('other order credits remain usable',state(other).credits,0);
record('last ad order refunded',(await submit(other)).status,200);
record('last refund hides ad',sqlite.prepare("SELECT status FROM admin_content_records WHERE id='manual-shared-ad'").get().status,'hidden');
record('no external payment requests',pgCalls,0);
const ledgerRequest=(role='',range='start=2000-01-01&end=2000-01-02',method='GET')=>worker.fetch(new Request('https://audit.local/api/admin-payment-ledger?'+range,{method,headers:{cookie:cookies[role]||''}}),manualEnv,{});
for(const role of ['','doctor','hospital'])record('ledger export forbidden '+(role||'anonymous'),(await ledgerRequest(role)).status,403);
record('ledger export invalid range',(await ledgerRequest('admin','start=2026-02-30&end=2026-03-01')).status,400);
record('ledger export rejects mutation method',(await ledgerRequest('admin',undefined,'POST')).status,405);
const exportResponse=await ledgerRequest('admin');
record('admin ledger export succeeds',exportResponse.status,200);
record('ledger download not cached',exportResponse.headers.get('cache-control'),'no-store');
record('ledger download uses CSV',exportResponse.headers.get('content-type'),'text/csv; charset=utf-8');
record('empty date range only exports header',(await exportResponse.text()).trim().split('\r\n').length,1);
globalThis.fetch=originalFetch;
console.log(JSON.stringify({passed:output.filter(r=>r.pass).length,total:output.length,failures:output.filter(r=>!r.pass)},null,2));
if(output.some(r=>!r.pass))process.exitCode=1;
