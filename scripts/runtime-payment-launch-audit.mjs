// Isolated SQLite and intercepted PG responses only; never contacts a payment provider.
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
import {PRIVACY_FORM_VERSION} from '../src/privacyConsent.js';
import worker from '../dist/server/index.js';
const db=new DatabaseSync(':memory:');
for(const f of (await readdir(new URL('../drizzle/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort())db.exec(await readFile(new URL('../drizzle/'+f,import.meta.url),'utf8'));
class Statement {
 constructor(sql,args=[]){this.sql=sql;this.args=args;}
 bind(...args){return new Statement(this.sql,args);}
 async first(column){const r=db.prepare(this.sql).get(...this.args);return column?r?.[column]:r;}
 async all(){return {results:db.prepare(this.sql).all(...this.args),success:true};}
 async run(){const r=db.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(r.changes)}};}
}
const DB={prepare:s=>new Statement(s),exec:async s=>db.exec(s),batch:async list=>{db.exec('BEGIN');try{const rows=[];for(const s of list)rows.push(await (/^\s*(SELECT|PRAGMA)/i.test(s.sql)?s.all():s.run()));db.exec('COMMIT');return rows;}catch(e){db.exec('ROLLBACK');console.error('Synthetic DB failure',e.message);throw e;}}};
const env={DB,ACCOUNT_HASH_SECRET:'isolated-payment-audit-secret-at-least-32',ADMIN_EMAILS:'admin@medihelpers.co.kr',TEST_ACCOUNT_SWITCH_ENABLED:'true',SIGNUP_ENABLED:'true',LEGAL_DOCUMENT_STATUS:'published'};
const cookies={},checks=[];
const check=(name,actual,expected)=>checks.push({name,pass:actual===expected,actual,expected});
async function call(path,role,body,e=env,origin='https://audit.local'){
 const r=await worker.fetch(new Request('https://audit.local'+path,{method:body?'POST':'GET',headers:{cookie:cookies[role]||'',origin,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),e,{});
 let data;try{data=await r.json();}catch{}return {status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0]};
}
for(const role of ['doctor','hospital','admin'])cookies[role]=(await call('/api/auth/test-switch','',{key:role})).cookie;
await call('/api/admin-console','admin');await call('/api/member-center','hospital');
const pg={...env,PAYMENT_LIVE:'true',CHECKOUT_ENABLED:'true',INICIS_ENV:'test',INICIS_MID:'INIpayTest',INICIS_SIGN_KEY:'synthetic-only',SITE_ORIGIN:'https://audit.local',INICIS_TAX_CONTRACT:'exempt',PAYMENT_PRODUCT_TAX_JSON:'{"basic":"exempt","featured":"exempt"}',INICIS_REFUND_MODE:'manual',INICIS_REFUNDS_ENABLED:'false'};
const consent={privacyVersion:PRIVACY_FORM_VERSION,checkoutAcknowledged:true};
const number=(sql,...args)=>db.prepare(sql).get(...args).n;
const visible=async id=>(await call('/api/site-operations','',undefined,pg)).data.contents.some(r=>r.id===id);
let active,providerCalls=0;
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url)=>{if(url!=='https://stgstdpay.inicis.com/api/payAuth')throw Error('Unexpected external request');providerCalls++;return Response.json({resultCode:'0000',mid:pg.INICIS_MID,MOID:active.order.orderNumber,TotPrice:String(active.order.totalAmount),payMethod:'Card',tid:('MOCK'+active.order.id.replaceAll('-','')).padEnd(40,'0')});};
const approve=async (value,overrides={})=>worker.fetch(new Request('https://audit.local/api/payment-approve',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded',origin:'https://stgstdpay.inicis.com'},body:new URLSearchParams({resultCode:'0000',mid:pg.INICIS_MID,orderNumber:value.order.orderNumber,merchantData:value.inicis.merchantData,idc_name:'stg',authToken:'SYNTHETIC',authUrl:'https://stgstdpay.inicis.com/api/payAuth',netCancelUrl:'https://stgstdpay.inicis.com/api/netCancel',...overrides})}),pg,{});
for(const productId of ['basic','featured']){
 const created=await call('/api/payment-orders','hospital',{...consent,productId,totalAmount:1,customerName:'FORGED',metadata:{title:'격리 광고 검수 '+productId,department:'내과',address:'서울',hospital:'FORGED',banner:'/banners/templates/medical-blue-v1.jpg',exposure:{end:'2999-12-31'}}},pg);
 check(productId+' order created',created.status,201);active=created.data;const {order}=active;
 check(productId+' amount not client controlled',order.totalAmount>1,true);
 check(productId+' starts hidden',await visible(order.contentRecordId),false);
 const row=db.prepare('SELECT customer_name,metadata_json FROM payment_orders WHERE id=?').get(order.id);
 check(productId+' buyer sourced from member',row.customer_name!=='FORGED',true);
 check(productId+' hospital not forged',JSON.parse(row.metadata_json).hospital!=='FORGED',true);
 const before=number('SELECT COUNT(*) n FROM payment_orders');
 const resume={...consent,resumeOrderNumber:order.orderNumber,totalAmount:1,productId:'talent-unlock-pack'};
 check(productId+' anonymous resume denied',(await call('/api/payment-orders','',resume,pg)).status,401);
 check(productId+' foreign owner resume denied',(await call('/api/payment-orders','doctor',resume,pg)).status,404);
 check(productId+' cross-site resume denied',(await call('/api/payment-orders','hospital',resume,pg,'https://evil.invalid')).status,403);
 check(productId+' paused checkout resume denied',(await call('/api/payment-orders','hospital',resume,{...pg,CHECKOUT_ENABLED:'false'})).status,503);
 const resumed=await call('/api/payment-orders','hospital',resume,pg);
 check(productId+' unpaid same order resumed',resumed.status,200);
 check(productId+' same order preserved',resumed.data.order?.orderNumber,order.orderNumber);
 check(productId+' price preserved',resumed.data.inicis?.price,String(order.totalAmount));
 check(productId+' no extra order',number('SELECT COUNT(*) n FROM payment_orders'),before);
 check(productId+' still hidden before approval',await visible(order.contentRecordId),false);
 active=resumed.data;active.order.contentRecordId=order.contentRecordId;
 check(productId+' forged callback rejected',(await approve(active,{merchantData:'fake'})).status,403);
 const callsBefore=providerCalls;
 const parallel=await Promise.all([approve(active),approve(active),approve(active)]);
 check(productId+' concurrent returns controlled',parallel.every(r=>r.status===303),true);
 check(productId+' one provider approval',providerCalls-callsBefore,1);
 check(productId+' one capture',number("SELECT COUNT(*) n FROM payment_transactions WHERE order_id=? AND transaction_type='capture'",order.id),1);
 check(productId+' publishes paid ad',await visible(order.contentRecordId),true);
 const content=JSON.parse(db.prepare('SELECT payload_json FROM admin_content_records WHERE id=?').get(order.contentRecordId).payload_json);
 check(productId+' server exposure replaces forged duration',content.exposure?.end!=='2999-12-31',true);
 check(productId+' tier',content.adTier,productId==='featured'?'featured':null);
 check(productId+' existing paid order not charged again',(await call('/api/payment-orders','hospital',resume,pg)).data.alreadyPaid,true);
 check(productId+' order does not expose private buyer',(await call('/api/site-operations','',undefined,pg)).data.contents.find(r=>r.id===order.contentRecordId)?.payload.phone,undefined);
 const refund=await call('/api/member-center','hospital',{action:'refund_request',orderNumber:order.orderNumber,reason:'격리 시험',...consent},pg);
 check(productId+' refund request',refund.status,200);
 const refundId=db.prepare('SELECT id FROM payment_refunds WHERE order_id=?').get(order.id).id;
 check(productId+' member refund starts unpriced',db.prepare('SELECT amount FROM payment_refunds WHERE id=?').get(refundId).amount,0);
 const tid=db.prepare("SELECT provider_transaction_id AS tid FROM payment_transactions WHERE order_id=? AND transaction_type='capture'").get(order.id).tid;
 const evidence={refundId,decision:'record_external',evidence:{tid,amount:order.totalAmount,canceledAt:new Date().toISOString(),reference:'Synthetic merchant-console evidence; no real transaction',confirmed:true}};
 check(productId+' member cannot record refund',(await call('/api/admin-refund-review','hospital',evidence,pg)).status,403);
 check(productId+' wrong amount refund denied',(await call('/api/admin-refund-review','admin',{...evidence,evidence:{...evidence.evidence,amount:1}},pg)).status,400);
 check(productId+' invalid refund keeps ad',await visible(order.contentRecordId),true);
 const recorded=await call('/api/admin-refund-review','admin',evidence,pg);
 if(recorded.status!==200)console.error('Synthetic refund diagnostic',recorded.data);
 check(productId+' admin evidence recorded',recorded.status,200);
 check(productId+' verified refund sets full amount',db.prepare('SELECT amount FROM payment_refunds WHERE id=?').get(refundId).amount,order.totalAmount);
 check(productId+' refund hides ad',await visible(order.contentRecordId),false);
 check(productId+' refunded resume denied',(await call('/api/payment-orders','hospital',resume,pg)).status,409);
}
const pending=await call('/api/payment-orders','hospital',{...consent,productId:'basic'},pg);
const pendingResume={...consent,resumeOrderNumber:pending.data.order.orderNumber};
const pendingMeta=db.prepare('SELECT metadata_json FROM payment_orders WHERE id=?').get(pending.data.order.id).metadata_json;
db.prepare('UPDATE payment_orders SET total_amount=1 WHERE id=?').run(pending.data.order.id);
check('changed stored price cannot reopen',(await call('/api/payment-orders','hospital',pendingResume,pg)).status,409);
db.prepare('UPDATE payment_orders SET total_amount=? WHERE id=?').run(pending.data.order.totalAmount,pending.data.order.id);
db.prepare('UPDATE payment_orders SET metadata_json=? WHERE id=?').run(JSON.stringify({...JSON.parse(pendingMeta),taxSnapshot:{}}),pending.data.order.id);
check('changed tax cannot reopen',(await call('/api/payment-orders','hospital',pendingResume,pg)).status,409);
db.prepare('UPDATE payment_orders SET metadata_json=? WHERE id=?').run(pendingMeta,pending.data.order.id);
db.prepare("INSERT INTO payment_pg_attempts(order_id,status) VALUES (?,'review')").run(pending.data.order.id);
check('uncertain approval cannot reopen',(await call('/api/payment-orders','hospital',{...consent,resumeOrderNumber:pending.data.order.orderNumber},pg)).status,409);
const r=await call('/api/resumes','doctor',{...consent,privacyConsent:true,createNew:true,title:'격리 재결제 검수',name:'합성 회원',phone:'01000000000',email:'synthetic@example.invalid',profession:'의사',specialty:'내과',desiredRegions:'서울',detail:{experienceYears:'8년',introduction:'실제 회원이 아닌 격리 검수 데이터입니다. 내과 외래 및 건강검진 경력에 대한 합성 소개입니다.',skills:'내과 외래',careers:[{institution:'가상 병원',department:'내과',duties:'외래'}]}},pg);
const p=await call('/api/job-seeker-posts','doctor',{...consent,privacyConsent:true,publicationAcknowledged:true,contactConsent:true,resumeId:r.data.id,title:'격리 재결제 검수',contactVisibility:'ticket'},pg);
if(p.status!==201)throw Error('Synthetic target setup failed: '+JSON.stringify({resume:r.data,post:p.data}));
check('resume target fixture',p.status,201);
pg.PAYMENT_PRODUCT_TAX_JSON=JSON.stringify({basic:'exempt',featured:'exempt','talent-unlock-single':'exempt'});
const t=await call('/api/payment-orders','hospital',{...consent,productId:'talent-unlock-single',metadata:{talentId:'seeker-'+p.data.post.id},contactVisibilityAtCheckout:'ticket'},pg);
check('targeted purchase fixture',t.status,201);
const rt={...consent,resumeOrderNumber:t.data.order.orderNumber};
check('target still public can resume',(await call('/api/payment-orders','hospital',rt,pg)).status,200);
db.prepare("UPDATE job_seeker_posts SET contact_visibility='private' WHERE id=?").run(p.data.post.id);
check('target private change prevents stale resume',(await call('/api/payment-orders','hospital',rt,pg)).status,409);
db.prepare("UPDATE job_seeker_posts SET contact_visibility='ticket',status='closed' WHERE id=?").run(p.data.post.id);
check('target removal prevents resume',(await call('/api/payment-orders','hospital',rt,pg)).status,409);
for(const [body,status] of [['x='+ 'A'.repeat(66000),413],['orderNumber=a&orderNumber=b',400]]){
 const r=await worker.fetch(new Request('https://audit.local/api/payment-approve',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body}),pg,{});check('malformed or oversized callback rejected',r.status,status);
}
globalThis.fetch=originalFetch;
console.log(JSON.stringify({total:checks.length,passed:checks.filter(r=>r.pass).length,failures:checks.filter(r=>!r.pass)},null,2));
if(checks.some(r=>!r.pass))process.exitCode=1;
