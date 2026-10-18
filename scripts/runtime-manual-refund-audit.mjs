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
let beforeBatch=null;
Statement.prototype.first=async function(column){
 const row=(await this.all()).results[0]||null;
 if(readBarrier?.pattern.test(this.sql)) {
  const b=readBarrier;b.count++;
  if(b.count===b.target)b.release();else await b.promise;
 }
 return column?row?.[column]:row;
};
const DB={prepare:sql=>new Statement(sql),batch:async statements=>{if(beforeBatch&&statements.some(s=>/INSERT INTO payment_pg_refunds/.test(s.sql))){const callback=beforeBatch;beforeBatch=null;callback();}sqlite.exec('BEGIN');try{const r=statements.map(s=>execute(s,/^\s*(SELECT|PRAGMA)/i.test(s.sql)));sqlite.exec('COMMIT');return r;}catch(e){sqlite.exec('ROLLBACK');throw e;}},exec:async sql=>sqlite.exec(sql)};
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
for (const canceledAt of ['2026-02-30T12:00:00Z','2026-10-01T12:00:00','2026-10-01T24:00:00Z']) {
 const before = JSON.stringify(state(f));
 record('invalid cancellation instant rejected '+canceledAt,(await submit(f,{body:{...f.body,evidence:{...f.body.evidence,canceledAt}}})).status,400);
 record('invalid cancellation instant preserves order and rights '+canceledAt,JSON.stringify(state(f)),before);
}
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
beforeStatement={pattern:/INSERT INTO payment_pg_refunds/,run:()=>sqlite.prepare("UPDATE payment_refunds SET status='cancelled' WHERE id=?").run(rejected.id)};
record('concurrent rejection blocks stale attestation',(await submit(rejected)).status,409);
record('stale attestation cannot revoke credits',state(rejected).credits,0);
const edited=await fixture();
const changedMetadata=JSON.stringify({operatorNote:'newer committed edit',exposure:{end:'2099-12-31'}});
beforeBatch=()=>sqlite.prepare('UPDATE payment_orders SET metadata_json=? WHERE id=?').run(changedMetadata,edited.order.id);
record('changed order blocks stale refund snapshot',(await submit(edited)).status,409);
record('newer order metadata is not overwritten',sqlite.prepare('SELECT metadata_json FROM payment_orders WHERE id=?').get(edited.order.id).metadata_json,changedMetadata);
record('stale snapshot keeps paid order',state(edited).order,'paid');
record('stale snapshot keeps usable credits',state(edited).credits,0);
record('stale snapshot creates no refund transaction',state(edited).refunds,0);
record('fresh retry can reconcile changed order',(await submit(edited)).status,200);
record('fresh refund preserves newer non-exposure metadata',JSON.parse(sqlite.prepare('SELECT metadata_json FROM payment_orders WHERE id=?').get(edited.order.id).metadata_json).operatorNote,'newer committed edit');
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
const exceptionResponse=await worker.fetch(new Request('https://audit.local/api/admin-console',{headers:{cookie:cookies.admin}}),manualEnv,{});
const exceptionData=await exceptionResponse.json();
record('unresolved refund appears in admin queue',exceptionData.paymentExceptions.items.some(x=>x.orderNumber===blocked.order.orderNumber && x.status==='review'),true);
record('completed manual refund absent from exception queue',exceptionData.paymentExceptions.items.some(x=>x.orderNumber===f.order.orderNumber),false);
record('exception queue does not call PG',pgCalls,0);
// Partial refunds, public result history and notification integrity (synthetic only).
async function requestedFixture() {
 const x=await fixture();sqlite.prepare('DELETE FROM payment_refunds WHERE id=?').run(x.id);
 const r=await call('/api/member-center','hospital',{action:'refund_request',orderNumber:x.order.orderNumber,reason:'합성 미사용분 환불 요청'});
 record('member request accepted',r.status,200);x.id=r.data.refundId;x.body.refundId=x.id;return x;
}
function partialBody(x,amount,remaining,tag='one') {
 return {...x.body,evidence:{...x.body.evidence,amount,remainingAmount:remaining,cancellationTid:'PARTIAL-'+x.id+'-'+tag,customerMessage:'사용분을 제외한 미사용분 환불 완료. 남은 서비스는 종료됩니다.'}};
}
const part=await requestedFixture(),partAmount=Math.floor(part.order.totalAmount/2);
const partPool=sqlite.prepare('SELECT id,hospital_account_id FROM talent_credit_pools WHERE order_id=?').get(part.order.id);
sqlite.prepare('UPDATE talent_credit_pools SET used_credits=2 WHERE id=?').run(partPool.id);
sqlite.prepare("INSERT INTO talent_unlocks(id,hospital_account_id,talent_id,order_id) VALUES ('partial-kept-access',?,'partial-used-person',?)").run(partPool.hospital_account_id,part.order.id);
const pbody=partialBody(part,partAmount,part.order.totalAmount-partAmount);
for(const diff of [{cancellationTid:''},{cancellationTid:part.body.evidence.tid},{remainingAmount:1},{customerMessage:''},{amount:0},{amount:1.2},{amount:'1'},{amount:part.order.totalAmount+1}]) {
 record('partial rejects invalid '+JSON.stringify(diff),(await submit(part,{body:{...pbody,evidence:{...pbody.evidence,...diff}}})).status,400);
}
const pendingCenter=(await call('/api/member-center','hospital')).data;
record('pending visible to requester',pendingCenter.orders.find(o=>o.orderNumber===part.order.orderNumber).refundPending,1);
record('pending counts show eight held',pendingCenter.orders.find(o=>o.orderNumber===part.order.orderNumber).creditUsage.held,8);
record('pending counts show zero available',pendingCenter.orders.find(o=>o.orderNumber===part.order.orderNumber).creditUsage.remaining,0);
record('request history records reason',pendingCenter.refunds.find(r=>r.id===part.id).reason,'합성 미사용분 환불 요청');
record('duplicate customer request blocked',(await call('/api/member-center','hospital',{action:'refund_request',orderNumber:part.order.orderNumber,reason:'duplicate'})).status,409);
record('partial recorded',(await submit(part,{body:pbody})).status,200);
record('partial status',state(part).order,'partially_refunded');
record('actual used count preserved',state(part).credits,2);
record('unused credits stopped',sqlite.prepare("SELECT json_extract(metadata_json,'$.refundServiceEnded') ended FROM payment_orders WHERE id=?").get(part.order.id).ended,1);
record('paid used access preserved',sqlite.prepare("SELECT COUNT(*) n FROM talent_unlocks WHERE id='partial-kept-access'").get().n,1);
record('partial amount matches ledger',sqlite.prepare("SELECT SUM(amount) n FROM payment_transactions WHERE order_id=? AND transaction_type='refund'").get(part.order.id).n,partAmount);
const partCenter=(await call('/api/member-center','hospital')).data;
record('member cumulative refund',partCenter.orders.find(o=>o.orderNumber===part.order.orderNumber).refundedAmount,partAmount);
record('partial counts retain two used',partCenter.orders.find(o=>o.orderNumber===part.order.orderNumber).creditUsage.used,2);
record('partial counts show zero available',partCenter.orders.find(o=>o.orderNumber===part.order.orderNumber).creditUsage.remaining,0);
record('partial counts explain service ended',partCenter.orders.find(o=>o.orderNumber===part.order.orderNumber).creditUsage.state,'ended');
record('member result amount',partCenter.refunds.find(r=>r.id===part.id).amount,partAmount);
record('member gets public explanation',partCenter.refunds.find(r=>r.id===part.id).customerMessage,pbody.evidence.customerMessage);
record('internal evidence not exposed',JSON.stringify(partCenter.refunds).includes('synthetic merchant-console'),false);
record('PG cancellation ID not exposed',JSON.stringify(partCenter.refunds).includes(pbody.evidence.cancellationTid),false);
record('member notified once',partCenter.alerts.filter(a=>a.id==='refund-result-'+part.id).length,1);
record('notification links to payment history',partCenter.alerts.find(a=>a.id==='refund-result-'+part.id).actionUrl,'/mypage?tab=payments&order='+encodeURIComponent(part.order.orderNumber));
record('other member cannot read refund',(await call('/api/member-center','doctor')).data.refunds.some(r=>r.id===part.id),false);
const repeatResult=await submit(part,{body:pbody});record('partial replay rejected',repeatResult.status,409);
record('notification not duplicated',(await call('/api/member-center','hospital')).data.alerts.filter(a=>a.id==='refund-result-'+part.id).length,1);
const req2=await call('/api/member-center','hospital',{action:'refund_request',orderNumber:part.order.orderNumber,reason:'남은 금액 추가 검토 요청'});
record('additional request after partial',req2.status,200);
const part2={...part,id:req2.data.refundId,body:{...part.body,refundId:req2.data.refundId}};
const remainder=part.order.totalAmount-partAmount;
const body2=partialBody(part2,remainder,0,'final');
record('over remaining amount rejected',(await submit(part2,{body:{...body2,evidence:{...body2.evidence,amount:remainder+1}}})).status,400);
record('prior cancel transaction replay rejected',(await submit(part2,{body:{...body2,evidence:{...body2.evidence,cancellationTid:pbody.evidence.cancellationTid}}})).status,409);
record('failed replay preserves first refund',sqlite.prepare("SELECT COUNT(*) n FROM payment_transactions WHERE order_id=? AND transaction_type='refund'").get(part.order.id).n,1);
record('remaining balance refunded',(await submit(part2,{body:body2})).status,200);
record('cumulative full refund terminal',state(part2).order,'refunded');
record('cumulative amount exactly original',sqlite.prepare("SELECT SUM(amount) n FROM payment_transactions WHERE order_id=? AND transaction_type='refund'").get(part.order.id).n,part.order.totalAmount);
record('two independent cancellations recorded',state(part2).refunds,2);
record('full cumulative refund removes previous access',sqlite.prepare("SELECT COUNT(*) n FROM talent_unlocks WHERE id='partial-kept-access'").get().n,0);
record('full refunded request blocked',(await call('/api/member-center','hospital',{action:'refund_request',orderNumber:part.order.orderNumber,reason:'duplicate'})).status,400);
const consoleAfter=await worker.fetch(new Request('https://audit.local/api/admin-console',{headers:{cookie:cookies.admin}}),manualEnv,{});
const afterData=await consoleAfter.json();
record('first confirmation not overwritten',afterData.refunds.find(r=>r.id===part.id).manualConfirmation.cancellationTid,pbody.evidence.cancellationTid);
record('second confirmation independent',afterData.refunds.find(r=>r.id===part2.id).manualConfirmation.cancellationTid,body2.evidence.cancellationTid);
record('admin cumulative refund',afterData.payments.find(r=>r.id===part.order.id).refundedAmount,part.order.totalAmount);
const kstDay=new Date(Date.now()+9*3600000).toISOString().slice(0,10);
const csv=await (await ledgerRequest('admin','start='+kstDay+'&end='+kstDay)).text();
record('CSV contains first cancellation',csv.includes(pbody.evidence.cancellationTid),true);
record('CSV contains second cancellation',csv.includes(body2.evidence.cancellationTid),true);
record('CSV one line for each refund',csv.split('\r\n').filter(line=>line.includes(part.order.orderNumber)&&line.includes('"취소"')).length,2);
const deny=await requestedFixture();
for(const reason of [undefined,'','  ','abc','x'.repeat(1001)]) record('reject reason mandatory '+String(reason?.length),(await submit(deny,{body:{refundId:deny.id,decision:'reject',reason}})).status,400);
injectedFailure=/INSERT INTO member_notifications/;
record('reject notification failure rolls back',(await submit(deny,{body:{refundId:deny.id,decision:'reject',reason:'합성 이용 내역상 환불 대상 아님'}})).status,409);
record('failed rejection remains requested',state(deny).refund,'requested');
record('failed rejection has no event',sqlite.prepare("SELECT COUNT(*) n FROM payment_events WHERE id=?").get('refund-rejected-'+deny.id).n,0);
const rejectBody={refundId:deny.id,decision:'reject',reason:'이미 사용한 열람 건입니다. 미사용 내역이 있다면 고객센터로 문의해주세요.'};
const rejectRace=await Promise.all([submit(deny,{body:rejectBody}),submit(deny,{body:rejectBody})]);
record('concurrent rejection once',rejectRace.filter(r=>r.status===200).length,1);
record('rejection leaves paid order',state(deny).order,'paid');
record('rejection leaves credits',state(deny).credits,0);
record('rejection never creates cancellation',state(deny).refunds,0);
const deniedCenter=(await call('/api/member-center','hospital')).data;
record('member sees rejection reason',deniedCenter.refunds.find(r=>r.id===deny.id).customerMessage,rejectBody.reason);
record('member sees rejection status',deniedCenter.refunds.find(r=>r.id===deny.id).status,'rejected');
record('rejected counts return ten available',deniedCenter.orders.find(o=>o.orderNumber===deny.order.orderNumber).creditUsage.remaining,10);
record('rejection notification once',deniedCenter.alerts.filter(r=>r.id==='refund-result-'+deny.id).length,1);
record('rejected order allows new request',(await call('/api/member-center','hospital',{action:'refund_request',orderNumber:deny.order.orderNumber,reason:'새 증빙으로 재검토 요청'})).status,200);
const failedNotice=await requestedFixture();
injectedFailure=/INSERT INTO member_notifications/;
record('refund notification failure blocks partial',(await submit(failedNotice,{body:partialBody(failedNotice,1,failedNotice.order.totalAmount-1)})).status,409);
record('notification failure paid preserved',state(failedNotice).order,'paid');
record('notification failure ledger empty',state(failedNotice).refunds,0);
record('notification failure no expired pool',sqlite.prepare('SELECT expires_at FROM talent_credit_pools WHERE order_id=?').get(failedNotice.order.id).expires_at,null);
record('notification retry safely succeeds',(await submit(failedNotice,{body:partialBody(failedNotice,1,failedNotice.order.totalAmount-1)})).status,200);
const memberRace=await fixture();sqlite.prepare('DELETE FROM payment_refunds WHERE id=?').run(memberRace.id);
const reqRace=await Promise.all([1,2,3].map(()=>call('/api/member-center','hospital',{action:'refund_request',orderNumber:memberRace.order.orderNumber,reason:'동시 접수 시험'})));
record('concurrent member requests one success',reqRace.filter(r=>r.status===200).length,1);
record('concurrent member requests one row',sqlite.prepare('SELECT COUNT(*) n FROM payment_refunds WHERE order_id=?').get(memberRace.order.id).n,1);
record('all new tests never call PG',pgCalls,0);

globalThis.fetch=originalFetch;
console.log(JSON.stringify({passed:output.filter(r=>r.pass).length,total:output.length,failures:output.filter(r=>!r.pass)},null,2));
if(output.some(r=>!r.pass))process.exitCode=1;

// Optional visual QA uses only this in-memory DB and synthetic captures.
if(process.argv.includes('--serve') && !process.exitCode) {
 const examples=[];
 for(const label of ['부분 환불 예시','반려 안내 예시','처리 대기 예시']) {
  const example=await requestedFixture();
  sqlite.prepare("UPDATE payment_orders SET product_name=?,created_at=datetime('now','+1 minute') WHERE id=?").run('화면 검수 · '+label+' (실제 결제 아님)',example.order.id);
  examples.push(example);
 }
 assert.equal((await submit(examples[0],{body:partialBody(examples[0],23200,examples[0].order.totalAmount-23200,'screen')})).status,200);
 await submit(examples[1],{body:{refundId:examples[1].id,decision:'reject',reason:'이용 내역 확인 결과 이미 사용된 서비스입니다. 추가 증빙이 있다면 고객센터에 재검토를 요청해주세요.'}});
 const {createServer}=await import('node:http');
 createServer(async(req,res)=>{
  try {
   const role=req.url==='/__login/admin'?'admin':req.url==='/__login/hospital'?'hospital':null;
   if(role){res.writeHead(302,{'Set-Cookie':cookies[role]+'; Path=/; HttpOnly; SameSite=Lax',Location:role==='admin'?'/admin/console':'/mypage?tab=payments'});res.end();return;}
   const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);
   const response=await worker.fetch(new Request('http://127.0.0.1:5195'+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{})}),manualEnv,{});
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(500);res.end('Local refund fixture error');}
 }).listen(5195,'127.0.0.1',()=>console.log('Refund UI fixture ready: http://127.0.0.1:5195/__login/hospital'));
}
