// Actual generated Cloudflare Worker + deployment vars, synthetic keys/identities,
// in-memory SQLite only. Every outbound fetch is intercepted: no PG/production I/O.
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PRIVACY_FORM_VERSION} from '../src/privacyConsent.js';
import worker from '../dist-cf/server/index.js';

const db=new DatabaseSync(':memory:');
for(const file of (await readdir(new URL('../drizzle/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort())
  db.exec(await readFile(new URL('../drizzle/'+file,import.meta.url),'utf8'));
let failCapture=false;
function execute(s,read=false){
  if(failCapture && /INSERT INTO payment_events.*SELECT/.test(s.sql)) {failCapture=false;throw Error('SIMULATED_CAPTURE_STORAGE_FAILURE');}
  const stmt=db.prepare(s.sql);
  if(read)return {results:stmt.all(...s.args),success:true};
  const r=stmt.run(...s.args);return {success:true,meta:{changes:Number(r.changes)}};
}
class Statement {
  constructor(sql,args=[]){this.sql=sql;this.args=args;}
  bind(...args){return new Statement(this.sql,args);}
  async all(){return execute(this,true);}
  async first(column){const row=(await this.all()).results[0]||null;return column?row?.[column]:row;}
  async run(){return execute(this);}
}
const DB={prepare:sql=>new Statement(sql),exec:async sql=>db.exec(sql),batch:async statements=>{
  db.exec('BEGIN');try{const rows=statements.map(s=>execute(s,/^\s*(SELECT|PRAGMA)/i.test(s.sql)));db.exec('COMMIT');return rows;}
  catch(e){db.exec('ROLLBACK');throw e;}
}};
const deployment=JSON.parse(await readFile(new URL('../deploy/cloudflare.live-with-legacy-replies.json',import.meta.url),'utf8'));
// Only configuration values are copied; never bind the deployment's remote D1.
const env={...deployment.vars,DB,ACCOUNT_HASH_SECRET:'isolated-live-config-audit-secret-at-least-32',
  ADMIN_EMAILS:'admin@medihelpers.co.kr',INICIS_MID:'UPmedihelp',
  INICIS_SIGN_KEY:'synthetic-sign-key-not-a-merchant-secret',INICIS_MOBILE_HASH_KEY:'synthetic-mobile-key'};
const origin=env.SITE_ORIGIN,cookies={},checks=[],scenarios=[],outbound=[];
const check=(name,actual,expected)=>checks.push({name,actual,expected,pass:actual===expected});
const one=(sql,...args)=>db.prepare(sql).get(...args);
const n=(sql,...args)=>one(sql,...args).n;
const consent={privacyVersion:PRIVACY_FORM_VERSION,privacyConsent:true,checkoutAcknowledged:true};
async function call(path,body,role='hospital',settings=env,headers={}){
  const response=await worker.fetch(new Request(origin+path,{method:body?'POST':'GET',headers:{origin,'content-type':'application/json',cookie:cookies[role]||'',...headers},...(body?{body:JSON.stringify(body)}:{})}),settings,{});
  let data;try{data=await response.json();}catch{}
  return {status:response.status,data,cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
const originalFetch=globalThis.fetch;
let active=null,behavior='success';
globalThis.fetch=async(url,init)=>{
  // Never fall back to originalFetch, even for an unrecognized URL.
  const address=String(url),allowed=active?.mobile
    ? ['https://'+active.center+'mobile.inicis.com/smart/payReq.ini','https://'+active.center+'mobile.inicis.com/smart/payNetCancel.ini']
    : ['https://'+active?.center+'stdpay.inicis.com/api/payAuth','https://'+active?.center+'stdpay.inicis.com/api/netCancel'];
  if(!active || !allowed.includes(address))throw Error('UNEXPECTED_OUTBOUND_REQUEST_BLOCKED');
  const cancel=address===allowed[1];outbound.push({order:active.order.orderNumber,kind:cancel?'net_cancel':'approve',channel:active.mobile?'mobile':'pc',center:active.center});
  if(init.method!=='POST'||init.redirect!=='manual')throw Error('INVALID_PROVIDER_REQUEST');
  if(behavior==='timeout')throw Error('SIMULATED_NETWORK_TIMEOUT');
  if(cancel)return active.mobile?new Response(new URLSearchParams({P_STATUS:'00',P_TID:active.tid})):Response.json({resultCode:'0000',mid:env.INICIS_MID,MOID:active.order.orderNumber,tid:active.tid});
  if(behavior==='declined')return active.mobile?new Response(new URLSearchParams({P_STATUS:'01'})):Response.json({resultCode:'A001'});
  const amount=behavior==='wrong_amount'?1:active.order.totalAmount;
  return active.mobile?new Response(new URLSearchParams({P_STATUS:'00',P_MID:env.INICIS_MID,P_OID:active.order.orderNumber,P_AMT:String(amount),P_TYPE:'CARD',P_TID:active.tid}))
    :Response.json({resultCode:'0000',mid:env.INICIS_MID,MOID:active.order.orderNumber,TotPrice:String(amount),payMethod:'Card',tid:active.tid});
};
async function make(productId,channel='pc',center='fc'){
  const r=await call('/api/payment-orders',{...consent,productId,totalAmount:1,metadata:{title:'격리 결제 시뮬레이션',department:'내과',paymentChannel:channel==='pc'?'mobile':'pc'}},'hospital',env,{'user-agent':channel==='mobile'?'iPhone Synthetic Mobile':'Windows Synthetic'});
  check(productId+' '+channel+' '+center+' created',r.status,201);
  if(r.status!==201)throw Error('Synthetic order could not be created: '+JSON.stringify(r.data));
  active={...r.data,mobile:channel==='mobile',center};
  active.tid='INIMX_CARD'+env.INICIS_MID+active.order.id.replaceAll('-','').slice(0,20);
  check('signed request uses live mode',active.inicis.live,true);
  check('callback targets production origin',active.inicis.returnUrl,origin+'/api/payment-approve');
  check('order amount ignores client one won',active.order.totalAmount>1,true);
  if(active.mobile){
    const f=active.inicis.fields;
    check('mobile security options',f.P_RESERVED,'centerCd=Y&amt_hash=Y');
    const expected=createHash('sha512').update(f.P_AMT+f.P_OID+f.P_TIMESTAMP+env.INICIS_MOBILE_HASH_KEY).digest('base64');
    check('mobile independently computed signature',f.P_CHKFAKE,expected);
  }else{
    const f=active.inicis;
    check('PC anti-forgery enabled',f.use_chkfake,'Y');
    check('PC independently computed verification',f.verification,createHash('sha256').update('oid='+f.oid+'&price='+f.price+'&signKey='+env.INICIS_SIGN_KEY+'&timestamp='+f.timestamp).digest('hex'));
  }
  return active;
}
function callback(value,overrides={}){
  const body=value.mobile?{P_STATUS:'00',P_TID:value.tid,P_AMT:String(value.order.totalAmount),P_NOTI:value.inicis.fields.P_NOTI,idc_name:value.center,P_REQ_URL:'https://'+value.center+'mobile.inicis.com/smart/payReq.ini'}
    :{resultCode:'0000',mid:env.INICIS_MID,orderNumber:value.order.orderNumber,merchantData:value.inicis.merchantData,authToken:'SYNTHETIC_AUTH',idc_name:value.center,authUrl:'https://'+value.center+'stdpay.inicis.com/api/payAuth',netCancelUrl:'https://'+value.center+'stdpay.inicis.com/api/netCancel'};
  return worker.fetch(new Request(origin+'/api/payment-approve',{method:'POST',headers:{origin:'https://'+value.center+(value.mobile?'mobile':'stdpay')+'.inicis.com','content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...body,...overrides})}),env,{});
}
const captureCount=id=>n("SELECT COUNT(*) n FROM payment_transactions WHERE order_id=? AND transaction_type='capture'",id);
const creditCount=id=>n('SELECT COALESCE(SUM(total_credits),0) n FROM talent_credit_pools WHERE order_id=?',id);
try{
  // Bootstrap synthetic local identities, then disable the helper before any transaction.
  for(const role of ['doctor','hospital','admin']){
    const r=await call('/api/auth/test-switch',{key:role},'',{...env,TEST_ACCOUNT_SWITCH_ENABLED:'true'});
    if(!r.cookie)throw Error('Local identity setup failed');cookies[role]=r.cookie;
  }
  await call('/api/member-center',undefined);await call('/api/admin-console',undefined,'admin');
  check('test login unavailable under live config',(await call('/api/auth/test-switch',{key:'hospital'})).status,404);
  check('virtual JSON approval unavailable',(await call('/api/payment-approve',{orderNumber:'does-not-exist'})).status,404);
  for(const [productId,amount,credits] of [['basic',59000,0],['featured',149000,0],['talent-unlock-single',3900,1],['talent-unlock-pack',29000,10],['talent-unlock-pack30',69000,30]]){
    for(const channel of ['pc','mobile'])for(const center of ['fc','ks']){
      behavior='success';const value=await make(productId,channel,center),{order}=value;
      check('catalog amount',order.totalAmount,amount);
      check('exempt tax stored',one('SELECT tax_amount tax FROM payment_orders WHERE id=?',order.id).tax,0);
      check('no capture before approval',captureCount(order.id),0);
      check('no credits before approval',creditCount(order.id),0);
      const bad=value.mobile?{P_NOTI:''}:{merchantData:''};
      const start=outbound.length;
      check('unsigned return rejected',(await callback(value,bad)).status,403);
      check('unsigned return never calls provider',outbound.length,start);
      const results=await Promise.all([callback(value),callback(value),callback(value)]);
      check('simultaneous callbacks controlled',results.every(r=>r.status===303),true);
      check('one provider approval per order',outbound.length-start,1);
      check('paid after signed provider approval',one('SELECT status FROM payment_orders WHERE id=?',order.id).status,'paid');
      check('one capture recorded',captureCount(order.id),1);
      check('correct credits',creditCount(order.id),credits);
      if(order.contentRecordId)check('paid advertisement published',one('SELECT status FROM admin_content_records WHERE id=?',order.contentRecordId).status,'published');
      check('repeated return stays paid',(await callback(value)).headers.get('location')?.includes('payment=paid'),true);
      check('repeated return does not reapprove',outbound.length-start,1);
      scenarios.push({productId,channel,center,amount,captures:1,credits,status:'paid'});
    }
  }
  for(const channel of ['pc','mobile'])for(const failure of ['declined','wrong_amount','storage_failure','timeout']){
    const value=await make('talent-unlock-pack',channel),{order}=value;
    behavior=failure;failCapture=failure==='storage_failure';const start=outbound.length;
    const result=await callback(value);
    const expected=failure==='declined'?'rejected':failure==='timeout'?'review':'net_cancelled';
    check(channel+' '+failure+' never says paid',result.headers.get('location')?.includes('payment=paid'),false);
    check(channel+' '+failure+' persisted state',one('SELECT status FROM payment_pg_attempts WHERE order_id=?',order.id).status,expected);
    check(channel+' '+failure+' no capture',captureCount(order.id),0);
    check(channel+' '+failure+' no rights',creditCount(order.id),0);
    const calls=outbound.length-start;
    check(channel+' '+failure+' attempts',calls,failure==='declined'?1:2);
    await callback(value);
    check(channel+' '+failure+' repeated callback does not charge',outbound.length-start,calls);
    scenarios.push({productId:'talent-unlock-pack',channel,failure,status:expected,captures:0,credits:0});
  }
  const before=n('SELECT COUNT(*) n FROM payment_orders');
  for(const [label,settings] of [['missing sign key',{INICIS_SIGN_KEY:''}],['missing mobile key',{INICIS_MOBILE_HASH_KEY:''}],['missing tax policy',{PAYMENT_PRODUCT_TAX_JSON:'{}'}]]){
    check(label+' blocks new order',(await call('/api/payment-orders',{...consent,productId:'talent-unlock-pack',paymentChannel:'mobile'},'hospital',{...env,...settings})).status,503);
    check(label+' no orphan order',n('SELECT COUNT(*) n FROM payment_orders'),before);
  }
  check('SQLite integrity',one('PRAGMA integrity_check').integrity_check,'ok');
  check('SQLite foreign keys',db.prepare('PRAGMA foreign_key_check').all().length,0);
  const failures=checks.filter(x=>!x.pass);
  console.log(JSON.stringify({scope:'local generated Cloudflare Worker, live vars, synthetic keys, intercepted PG; no actual charge or network',total:checks.length,passed:checks.length-failures.length,failures,scenarios,providerRequestsIntercepted:outbound.length},null,2));
  if(failures.length)process.exitCode=1;
}finally{globalThis.fetch=originalFetch;db.close();}
