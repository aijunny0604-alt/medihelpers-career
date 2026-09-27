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
const createOrder=async(productId='talent-unlock-pack',metadata={})=>(await call('/api/payment-orders','hospital',{productId,metadata})).data.order;
const approve=order=>call('/api/payment-approve','hospital',{orderNumber:order.orderNumber});
const count=(sql,...args)=>sqlite.prepare(sql).get(...args).n;
const pgEnv={...env,INICIS_ENV:'test',INICIS_MID:'INIpayTest',INICIS_SIGN_KEY:'synthetic-sign-key',SITE_ORIGIN:'https://audit.local',PAYMENT_LIVE:'true'};
const originalFetch=globalThis.fetch;
let pgCalls=0, activeOrder;
const vendorBody=()=>({resultCode:'0000',mid:pgEnv.INICIS_MID,MOID:activeOrder.orderNumber,TotPrice:String(activeOrder.totalAmount),payMethod:'Card',tid:'SYNTHETIC-'+activeOrder.id});
globalThis.fetch=async()=>{pgCalls++;return new Response(JSON.stringify(vendorBody()));};
async function make() {
 const response=await worker.fetch(new Request('https://audit.local/api/payment-orders',{method:'POST',headers:{cookie:cookies.hospital,origin:'https://audit.local','content-type':'application/json'},body:JSON.stringify({productId:'talent-unlock-pack',privacyVersion:PRIVACY_FORM_VERSION,privacyConsent:true,checkoutAcknowledged:true})}),pgEnv,{});
 const value=await response.json();record('signed PG order creation',response.status,201);activeOrder=value.order;return value;
}
const makeBody=value=>({resultCode:'0000',mid:pgEnv.INICIS_MID,orderNumber:value.order.orderNumber,merchantData:value.inicis.merchantData,idc_name:'stg',authToken:'synthetic',authUrl:'https://stgstdpay.inicis.com/api/payAuth',netCancelUrl:'https://stgstdpay.inicis.com/api/netCancel'});
const form=(body)=>worker.fetch(new Request('https://audit.local/api/payment-approve',{method:'POST',headers:{origin:'https://stgstdpay.inicis.com','content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams(body)}),pgEnv,{});
let value=await make();
record('PC anti-forgery field',value.inicis.use_chkfake,'Y');
record('staging script selected',value.inicis.live,false);
record('server buyer contact retained',Boolean(value.inicis.buyeremail),true);
record('unsigned cross-site return denied',(await form({...makeBody(value),merchantData:''})).status,403);
record('unsigned return never calls PG',pgCalls,0);
record('signed cross-site return accepted without cookie',(await form(makeBody(value))).status,303);
record('capture recorded once',count('SELECT COUNT(*) n FROM payment_transactions WHERE order_id=? AND provider=\'inicis\'',value.order.id),1);
record('credits granted once',count('SELECT SUM(total_credits) n FROM talent_credit_pools WHERE order_id=?',value.order.id),10);
record('duplicate PG form succeeds',(await form(makeBody(value))).status,303);
record('duplicate PG form does not call PG again',pgCalls,1);
record('attempt committed with ledger',sqlite.prepare('SELECT status FROM payment_pg_attempts WHERE order_id=?').get(value.order.id).status,'captured');
const manual=await worker.fetch(new Request('https://audit.local/api/admin-console',{method:'PATCH',headers:{cookie:cookies.admin,origin:'https://audit.local','content-type':'application/json'},body:JSON.stringify({action:'payment_update',payload:{id:value.order.id,status:'paid'}})}),pgEnv,{});
record('live status cannot be manually forged through read-only console',manual.status,405);
const capturedOrder=value.order;
sqlite.prepare("INSERT INTO payment_refunds(id,order_id,amount,reason) VALUES (?,?,?,'synthetic refund')").run('pg-refund-1',capturedOrder.id,capturedOrder.totalAmount);
const refundEnv={...pgEnv,INICIS_REFUNDS_ENABLED:'true',INICIS_API_KEY:'synthetic-api-key',INICIS_CLIENT_IP:'192.0.2.1'};
const refundCall=(role='admin',testEnv=refundEnv)=>worker.fetch(new Request('https://audit.local/api/admin-refund-review',{method:'POST',headers:{cookie:cookies[role],origin:'https://audit.local','content-type':'application/json'},body:JSON.stringify({refundId:'pg-refund-1',decision:'approve'})}),testEnv,{});
record('member cannot refund through admin route',(await refundCall('hospital')).status,403);
record('PG refund disabled by default',(await refundCall('admin',pgEnv)).status,503);
let refundsSent=0;
globalThis.fetch=async(url)=>{assert.equal(url,'https://stginiapi.inicis.com/api/v1/refund');refundsSent++;return new Response(JSON.stringify({resultCode:'00'}));};
injectedFailure=/INSERT OR IGNORE INTO payment_transactions/;
record('local failure after PG refund remains recoverable',(await refundCall()).status,409);
record('local failure preserves entitlements until atomic save',count('SELECT SUM(total_credits-used_credits) n FROM talent_credit_pools WHERE order_id=?',capturedOrder.id),10);
record('PG confirmed status survives local rollback',sqlite.prepare('SELECT status FROM payment_pg_refunds WHERE order_id=?').get(capturedOrder.id).status,'provider_confirmed');
record('retry completes local save',(await refundCall()).status,200);
record('no repeat external refund',refundsSent,1);
record('refund removes available credits',count('SELECT SUM(total_credits-used_credits) n FROM talent_credit_pools WHERE order_id=?',capturedOrder.id),0);
record('refund ledger recorded once',count("SELECT COUNT(*) n FROM payment_transactions WHERE order_id=? AND transaction_type='refund'",capturedOrder.id),1);
record('order becomes refunded',sqlite.prepare('SELECT status FROM payment_orders WHERE id=?').get(capturedOrder.id).status,'refunded');
record('completed refund cannot be resubmitted',(await refundCall()).status,409);
globalThis.fetch=async()=>{pgCalls++;return new Response(JSON.stringify(vendorBody()));};
value=await make();injectedFailure=/INSERT INTO payment_events.*SELECT/;
const compensation=await form(makeBody(value));
record('failed capture redirects without success',compensation.headers.get('location')?.includes('payment=failed'),true);
record('failed capture creates no rights',count('SELECT COUNT(*) n FROM talent_credit_pools WHERE order_id=?',value.order.id),0);
record('failed capture rolled back ledger',count('SELECT COUNT(*) n FROM payment_transactions WHERE order_id=?',value.order.id),0);
record('failed capture compensates',sqlite.prepare('SELECT status FROM payment_pg_attempts WHERE order_id=?').get(value.order.id).status,'net_cancelled');

value=await make();
beforeStatement={pattern:/INSERT INTO talent_credit_pools/,run:()=>sqlite.prepare("UPDATE payment_orders SET status='refunded' WHERE id=?").run(value.order.id)};
await form(makeBody(value));
record('concurrent refund blocks late credit grant',count('SELECT COUNT(*) n FROM talent_credit_pools WHERE order_id=?',value.order.id),0);
record('late fulfillment cannot undo refunded order',sqlite.prepare('SELECT status FROM payment_orders WHERE id=?').get(value.order.id).status,'refunded');
globalThis.fetch=originalFetch;
console.log(JSON.stringify({passed:output.filter(r=>r.pass).length,total:output.length,failures:output.filter(r=>!r.pass)},null,2));
if(output.some(r=>!r.pass))process.exitCode=1;
