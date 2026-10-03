import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {inicisRequestParams,inicisMobileHash,inicisMobileReturn,inicisMobileEndpoints,inicisMobilePost,validateInicisMobileApproval,processInicisMobileApproval,verifyInicisState} from './inicisStandard.js';
const env={INICIS_ENV:'test',INICIS_MID:'INIpayTest',INICIS_SIGN_KEY:'synthetic-only',INICIS_MOBILE_HASH_KEY:'synthetic-mobile',INICIS_MOBILE_ENABLED:'true',SITE_ORIGIN:'https://audit.local',INICIS_TAX_CONTRACT:'exempt',PAYMENT_PRODUCT_TAX_JSON:'{"synthetic":"exempt"}'};
const order={id:'mobile-order',orderNumber:'MOBILE-1',productId:'synthetic',amount:59000,channel:'mobile',productName:'테스트 상품',buyerName:'테스트'};
const tid='INIMX_CARD'+env.INICIS_MID+'20260927123456789012';
const body={P_STATUS:'00',P_TID:'INIMX_AUTH'+env.INICIS_MID+'20260927123456789012',P_AMT:'59000',idc_name:'stg',P_REQ_URL:'https://stgmobile.inicis.com/smart/payReq.ini'};
const approval={P_STATUS:'00',P_TID:tid,P_MID:env.INICIS_MID,P_OID:order.orderNumber,P_AMT:'59000',P_TYPE:'CARD'};
const nvp=data=>new Response(new URLSearchParams(data).toString());
function database() {
 const db=new DatabaseSync(':memory:'); db.exec("CREATE TABLE payment_orders(id TEXT PRIMARY KEY); INSERT INTO payment_orders VALUES ('mobile-order')");
 db.exec(readFileSync(new URL('../drizzle/0018_inicis_attempts.sql',import.meta.url),'utf8'));
 const wrap=(sql,args=[])=>({bind:(...a)=>wrap(sql,a),run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}}),first:async()=>db.prepare(sql).get(...args)});
 return {db,DB:{prepare:sql=>wrap(sql)},capture:async()=>db.prepare("UPDATE payment_pg_attempts SET status='captured' WHERE order_id=?").run(order.id)};
}
test('mobile request signs raw SHA512 bytes as Base64 and binds return to server order',async()=>{
 const p=await inicisRequestParams(env,order),f=p.fields;
 assert.equal(p.mobile,true);assert.equal(f.P_RESERVED,'centerCd=Y&amt_hash=Y');assert.equal(f.P_CHARSET,'utf8');
 assert.equal(f.P_CHKFAKE,createHash('sha512').update('59000MOBILE-1'+f.P_TIMESTAMP+env.INICIS_MOBILE_HASH_KEY).digest('base64'));
 const r=inicisMobileReturn({P_NOTI:f.P_NOTI});assert.equal(r.oid,order.orderNumber);assert.equal(await verifyInicisState(env,order,r.state),true);
 assert.equal(f.P_TAX,undefined);assert.ok(!JSON.stringify(p).includes(env.INICIS_MOBILE_HASH_KEY));assert.ok(!JSON.stringify(p).includes(env.INICIS_SIGN_KEY));
});
test('mobile requires explicit enablement and separate key before order creation',async()=>{
 for(const overrides of [{INICIS_MOBILE_ENABLED:'false'},{INICIS_MOBILE_HASH_KEY:''}]) await assert.rejects(inicisRequestParams({...env,...overrides},order));
 await assert.rejects(inicisRequestParams(env,{...order,orderNumber:'bad|order'}));
 await assert.rejects(inicisRequestParams(env,{...order,amount:100000000}));
});
test('mobile merchant-defined tax keeps explicit zero',async()=>{
 const p=await inicisRequestParams({...env,INICIS_TAX_CONTRACT:'merchant'},order);assert.equal(p.fields.P_TAX,'0');assert.equal(p.fields.P_TAXFREE,'59000');
});
test('mobile state parser rejects conflicting or malformed order identifiers',async()=>{
 const p=await inicisRequestParams(env,order);
 for(const b of [{P_NOTI:''},{P_NOTI:p.fields.P_NOTI,P_OID:'OTHER'},{P_NOTI:p.fields.P_NOTI+'x'}])assert.throws(()=>inicisMobileReturn(b));
});
test('mobile auth endpoint is exact and bound to configured IDC environment',()=>{
 assert.equal(inicisMobileEndpoints(env,body).auth,body.P_REQ_URL);
 for(const url of [body.P_REQ_URL+'?x=1',body.P_REQ_URL+'/',body.P_REQ_URL.replace('stg','fc'),'https://stgmobile.inicis.com.evil.test/smart/payReq.ini','http://stgmobile.inicis.com/smart/payReq.ini'])assert.throws(()=>inicisMobileEndpoints(env,{...body,P_REQ_URL:url}));
 assert.throws(()=>inicisMobileEndpoints({...env,INICIS_ENV:'live'},body));
});
test('mobile response parser supports NVP and JSON but rejects duplicate status',async()=>{
 const fields={P_TID:body.P_TID};
 assert.equal((await inicisMobilePost(body.P_REQ_URL,fields,async()=>nvp(approval))).P_STATUS,'00');
 assert.equal((await inicisMobilePost(body.P_REQ_URL,fields,async()=>new Response(JSON.stringify(approval)))).P_STATUS,'00');
 await assert.rejects(inicisMobilePost(body.P_REQ_URL,fields,async()=>new Response('P_STATUS=00&P_STATUS=99')));
});
for(const changes of [{P_MID:'OTHER'},{P_OID:'OTHER'},{P_AMT:'1'},{P_AMT:'59000.0'},{P_TYPE:'BANK'},{P_TID:'bad'}])test('mobile approval rejects mismatched '+Object.keys(changes)[0]+':'+Object.values(changes)[0],()=>{
 assert.equal(validateInicisMobileApproval(env,order,{...approval,...changes}),false);
});
test('mobile duplicate returns approve and capture once',async()=>{
 const local=database();let calls=0;
 const fetcher=async(url,init)=>{calls++;assert.equal(url,body.P_REQ_URL);assert.equal(init.redirect,'manual');return nvp(approval);};
 const results=await Promise.all([1,2,3].map(()=>processInicisMobileApproval({...env,DB:local.DB},order,body,local.capture,fetcher)));
 assert.equal(calls,1);assert.equal(results.filter(r=>r.status==='paid').length,1);local.db.close();
});
test('mobile authentication amount mismatch never calls provider',async()=>{
 const local=database();let calls=0;
 assert.equal((await processInicisMobileApproval({...env,DB:local.DB},order,{...body,P_AMT:'1'},local.capture,async()=>{calls++;})).status,'rejected');assert.equal(calls,0);local.db.close();
});
for(const kind of ['timeout','wrongAmount','localFailure'])test('mobile '+kind+' performs signed net cancellation',async()=>{
 const local=database();let calls=0;
 const fetcher=async(url,init)=>{calls++;if(url===body.P_REQ_URL){if(kind==='timeout')throw Error('timeout');return nvp({...approval,...(kind==='wrongAmount'?{P_AMT:'1'}:{})});}
 assert.equal(url,'https://stgmobile.inicis.com/smart/payNetCancel.ini');const p=init.body;
 assert.equal(p.get('P_CHKFAKE'),await inicisMobileHash(env,order.amount,order.orderNumber,p.get('P_TIMESTAMP')));
 return nvp({P_STATUS:'00',P_TID:tid});};
 const r=await processInicisMobileApproval({...env,DB:local.DB},order,body,async()=>{throw Error('disk');},fetcher);
 assert.equal(r.status,'net_cancelled');assert.equal(calls,2);local.db.close();
});
test('uncertain mobile cancellation retains claim and never retries approval',async()=>{
 const local=database();let calls=0;const fetcher=async()=>{calls++;throw Error('network');};
 assert.equal((await processInicisMobileApproval({...env,DB:local.DB},order,body,local.capture,fetcher)).status,'review');
 assert.equal((await processInicisMobileApproval({...env,DB:local.DB},order,body,local.capture,fetcher)).status,'pending');assert.equal(calls,2);local.db.close();
});
test('mobile capture response loss after commit does not cancel the paid transaction',async()=>{
 const local=database();let calls=0;
 const r=await processInicisMobileApproval({...env,DB:local.DB},order,body,async()=>{await local.capture();throw Error('response loss');},async()=>{calls++;return nvp(approval);});
 assert.equal(r.status,'paid');assert.equal(calls,1);local.db.close();
});
