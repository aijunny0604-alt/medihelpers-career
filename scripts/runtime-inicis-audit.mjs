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
const pgEnv={...env,INICIS_TAX_CONTRACT:'taxable',PAYMENT_PRODUCT_TAX_JSON:'{"talent-unlock-pack":"taxable"}',INICIS_ENV:'test',INICIS_MID:'INIpayTest',INICIS_SIGN_KEY:'synthetic-sign-key',SITE_ORIGIN:'https://audit.local',PAYMENT_LIVE:'true'};
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
// Misconfiguration cannot leave an order, consent or ad draft behind.
const guardedOrder = (overrides={},metadata={}) => worker.fetch(new Request('https://audit.local/api/payment-orders',{method:'POST',headers:{cookie:cookies.hospital,origin:'https://audit.local','content-type':'application/json'},body:JSON.stringify({productId:'talent-unlock-pack',privacyVersion:PRIVACY_FORM_VERSION,privacyConsent:true,checkoutAcknowledged:true,metadata})}),{...pgEnv,...overrides},{});
for(const overrides of [{INICIS_TAX_CONTRACT:''},{INICIS_TAX_CONTRACT:'exempt'},{PAYMENT_PRODUCT_TAX_JSON:'{}'},{INICIS_SIGN_KEY:''}]) {
 const before=count('SELECT COUNT(*) n FROM payment_orders');
 record('unconfirmed PG configuration rejected',(await guardedOrder(overrides)).status,503);
 record('rejected configuration creates no order',count('SELECT COUNT(*) n FROM payment_orders'),before);
}
const zeroVatResponse=await guardedOrder({INICIS_TAX_CONTRACT:'merchant',PAYMENT_PRODUCT_TAX_JSON:'{"talent-unlock-pack":"exempt"}'},{taxSnapshot:{mode:'taxable',taxAmount:999999}});
record('confirmed exempt product creates order',zeroVatResponse.status,201);
const zeroVat=await zeroVatResponse.json();
const storedTax=sqlite.prepare('SELECT total_amount,supply_amount,tax_amount,metadata_json FROM payment_orders WHERE id=?').get(zeroVat.order.id);
record('zero VAT stored exactly',storedTax.tax_amount,0);
record('exempt supply equals total',storedTax.supply_amount,storedTax.total_amount);
record('client tax snapshot overwritten',JSON.parse(storedTax.metadata_json).taxSnapshot.mode,'exempt');
record('merchant taxfree sent to PG',zeroVat.inicis.taxfree,String(storedTax.total_amount));
record('merchant zero tax sent to PG',zeroVat.inicis.tax,'0');
// Mobile callbacks have no P_OID: recover the order only from signed P_NOTI.
const mobileEnv={...pgEnv,INICIS_MOBILE_ENABLED:'true',INICIS_MOBILE_HASH_KEY:'synthetic-mobile-key'};
const mobileCreate=(overrides={})=>worker.fetch(new Request('https://audit.local/api/payment-orders',{method:'POST',headers:{cookie:cookies.hospital,origin:'https://audit.local','user-agent':'Synthetic Android Mobile','content-type':'application/json'},body:JSON.stringify({productId:'talent-unlock-pack',privacyVersion:PRIVACY_FORM_VERSION,privacyConsent:true,checkoutAcknowledged:true,metadata:{paymentChannel:'pc'}})}),{...mobileEnv,...overrides},{});
for(const overrides of [{INICIS_MOBILE_ENABLED:'false'},{INICIS_MOBILE_HASH_KEY:''}]) {
 const before=count('SELECT COUNT(*) n FROM payment_orders');
 record('unready mobile payment rejected',(await mobileCreate(overrides)).status,503);
 record('unready mobile creates no order',count('SELECT COUNT(*) n FROM payment_orders'),before);
}
const mobileResponse=await mobileCreate();record('mobile Worker creates signed order',mobileResponse.status,201);
const mobile=await mobileResponse.json();record('mobile selected by request UA',mobile.inicis.mobile,true);
record('mobile channel cannot be overridden in client metadata',JSON.parse(sqlite.prepare('SELECT metadata_json FROM payment_orders WHERE id=?').get(mobile.order.id).metadata_json).paymentChannel,'mobile');
const mobileTid='INIMX_CARD'+mobileEnv.INICIS_MID+'20260927123456789012';
const mobileBody={P_STATUS:'00',P_TID:'INIMX_AUTH'+mobileEnv.INICIS_MID+'20260927123456789012',P_AMT:String(mobile.order.totalAmount),P_NOTI:mobile.inicis.fields.P_NOTI,idc_name:'stg',P_REQ_URL:'https://stgmobile.inicis.com/smart/payReq.ini'};
const mobileForm=(b)=>worker.fetch(new Request('https://audit.local/api/payment-approve',{method:'POST',headers:{origin:'https://stgmobile.inicis.com','content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams(b)}),mobileEnv,{});
let mobileCalls=0;
globalThis.fetch=async(url)=>{mobileCalls++;assert.equal(url,mobileBody.P_REQ_URL);return new Response(new URLSearchParams({P_STATUS:'00',P_MID:mobileEnv.INICIS_MID,P_OID:mobile.order.orderNumber,P_AMT:String(mobile.order.totalAmount),P_TYPE:'CARD',P_TID:mobileTid}));};
record('mobile unsigned state rejected',(await mobileForm({...mobileBody,P_NOTI:''})).status,403);
record('mobile conflicting order field rejected',(await mobileForm({...mobileBody,P_OID:'OTHER'})).status,403);
record('invalid mobile return never calls provider',mobileCalls,0);
record('mobile no-cookie callback redirects to paid',(await mobileForm(mobileBody)).headers.get('location')?.includes('payment=paid'),true);
record('mobile order becomes paid',sqlite.prepare('SELECT status FROM payment_orders WHERE id=?').get(mobile.order.id).status,'paid');
record('mobile credit pool granted once',count('SELECT COUNT(*) n FROM talent_credit_pools WHERE order_id=?',mobile.order.id),1);
record('mobile capture ledger once',count("SELECT COUNT(*) n FROM payment_transactions WHERE order_id=? AND transaction_type='capture'",mobile.order.id),1);
record('mobile duplicate redirects to same paid result',(await mobileForm(mobileBody)).headers.get('location')?.includes('payment=paid'),true);
record('mobile duplicate never re-approves with PG',mobileCalls,1);
record('mobile duplicate never re-grants credits',count('SELECT COUNT(*) n FROM talent_credit_pools WHERE order_id=?',mobile.order.id),1);
record('PC callback cannot fulfill mobile order',(await form({resultCode:'0000',orderNumber:mobile.order.orderNumber,merchantData:mobile.inicis.fields.P_NOTI.split('|')[1]})).status,403);

globalThis.fetch=originalFetch;
const securityResponse=await worker.fetch(new Request('https://audit.local/'),env,{});
const formAction=securityResponse.headers.get('content-security-policy')?.split(';').find(value=>value.trim().startsWith('form-action '));
record('browser policy permits exact mobile payment origin',formAction?.split(/\s+/).includes('https://mobile.inicis.com'),true);
console.log(JSON.stringify({passed:output.filter(r=>r.pass).length,total:output.length,failures:output.filter(r=>!r.pass)},null,2));
if(output.some(r=>!r.pass))process.exitCode=1;
