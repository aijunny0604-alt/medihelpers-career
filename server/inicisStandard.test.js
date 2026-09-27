import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {inicisRequestParams, inicisState, verifyInicisState, inicisEndpoints, validateInicisApproval, processInicisApproval, inicisRefundFields, processInicisRefund} from './inicisStandard.js';
const env = {INICIS_TAX_CONTRACT:'taxable',PAYMENT_PRODUCT_TAX_JSON:'{"synthetic":"taxable"}',INICIS_ENV:'test',INICIS_MID:'INIpayTest',INICIS_SIGN_KEY:'synthetic-only-signing-secret',SITE_ORIGIN:'https://staging.example.com'};
const order = {id:'order-id',orderNumber:'ORDER-1',productId:'synthetic',amount:59000};
const response = {resultCode:'0000',mid:env.INICIS_MID,MOID:order.orderNumber,TotPrice:'59000',payMethod:'Card',tid:'SYNTHETIC-TID-12345'};
const body = {resultCode:'0000',mid:env.INICIS_MID,idc_name:'stg',authToken:'synthetic-token',authUrl:'https://stgstdpay.inicis.com/api/payAuth',netCancelUrl:'https://stgstdpay.inicis.com/api/netCancel'};
function database() {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE payment_orders(id TEXT PRIMARY KEY); INSERT INTO payment_orders VALUES (\'order-id\')');
  db.exec(readFileSync(new URL('../drizzle/0018_inicis_attempts.sql',import.meta.url),'utf8'));
  const wrap = (sql,args=[]) => ({bind:(...a)=>wrap(sql,a),run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}}),first:async()=>db.prepare(sql).get(...args)});
  return {db,DB:{prepare:sql=>wrap(sql)},capture:async()=>db.prepare("UPDATE payment_pg_attempts SET status='captured' WHERE order_id=?").run(order.id)};
}
const json = data => new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});
const refundEnv={...env,INICIS_API_KEY:'synthetic-api-key',INICIS_CLIENT_IP:'192.0.2.1'};
const refund={id:'refund-1',orderId:order.id,reason:'회원 요청'};
test('refund signing uses KST, configured IP and server-only key',async()=>{
  const fields=await inicisRefundFields(refundEnv,response.tid,refund.reason,new Date('2026-09-27T00:00:00Z'));
  assert.equal(fields.timestamp,'20260927090000');
  assert.equal(fields.hashData,createHash('sha512').update('synthetic-api-keyRefundCard20260927090000192.0.2.1INIpayTest'+response.tid).digest('hex'));
  assert.ok(!JSON.stringify(fields).includes(refundEnv.INICIS_API_KEY));
  await assert.rejects(inicisRefundFields({...refundEnv,INICIS_CLIENT_IP:''},response.tid,''));
});
test('concurrent full refund calls PG once and persists completion',async()=>{
  const local=database();let calls=0;
  const finalize=async()=>local.db.exec("UPDATE payment_pg_refunds SET status='completed'");
  const fetcher=async(url)=>{assert.equal(url,'https://stginiapi.inicis.com/api/v1/refund');calls++;await new Promise(r=>setTimeout(r,10));return json({resultCode:'00'});};
  const results=await Promise.all([1,2,3].map(()=>processInicisRefund({...refundEnv,DB:local.DB},refund,response.tid,finalize,fetcher)));
  assert.equal(calls,1);assert.equal(results.filter(r=>r.status==='refunded').length,1);
  assert.equal((await processInicisRefund({...refundEnv,DB:local.DB},refund,response.tid,finalize,fetcher)).duplicate,true);
  assert.equal(calls,1);local.db.close();
});
test('confirmed refund with failed local save retries only local finalization',async()=>{
  const local=database();let calls=0;
  const fetcher=async()=>{calls++;return json({resultCode:'00'});};
  assert.equal((await processInicisRefund({...refundEnv,DB:local.DB},refund,response.tid,async()=>{throw Error('disk');},fetcher)).status,'pending_local');
  assert.equal((await processInicisRefund({...refundEnv,DB:local.DB},refund,response.tid,async()=>local.db.exec("UPDATE payment_pg_refunds SET status='completed'"),fetcher)).status,'refunded');
  assert.equal(calls,1);local.db.close();
});
for(const failure of ['timeout','malformed','rejected']) test('ambiguous refund '+failure+' neither revokes rights nor retries PG',async()=>{
  const local=database();let calls=0,finalized=0;
  const fetcher=async()=>{calls++;if(failure==='timeout')throw Error('network');return failure==='malformed'?new Response('bad'):json({resultCode:'99'});};
  const finalize=async()=>{finalized++;};
  for(let i=0;i<2;i++) assert.equal((await processInicisRefund({...refundEnv,DB:local.DB},refund,response.tid,finalize,fetcher)).status,'review');
  assert.equal(calls,1);assert.equal(finalized,0);local.db.close();
});
test('request includes vendor verification, signed return state and explicit test environment',async()=>{
  const p = await inicisRequestParams(env,order);
  assert.equal(p.verification,createHash('sha256').update('oid=ORDER-1&price=59000&signKey='+env.INICIS_SIGN_KEY+'&timestamp='+p.timestamp).digest('hex'));
  assert.equal(p.use_chkfake,'Y');assert.equal(p.acceptmethod,'centerCd(Y)');assert.equal(p.live,false);
  assert.ok(await verifyInicisState(env,order,p.merchantData));assert.ok(!JSON.stringify(p).includes(env.INICIS_SIGN_KEY));
});
test('missing environment and non-HTTPS or path origins fail closed',async()=>{
  await assert.rejects(inicisRequestParams({...env,INICIS_ENV:undefined},order));
  for(const SITE_ORIGIN of ['http://site.test','https://site.test/path','https://user@site.test']) await assert.rejects(inicisRequestParams({...env,SITE_ORIGIN},order));
});
test('return state cannot change order, amount, origin, MID, expiry or signature',async()=>{
  const state = await inicisState(env,order);
  for(const changed of [{...order,amount:1},{...order,orderNumber:'ORDER-2'}]) assert.equal(await verifyInicisState(env,changed,state),false);
  for(const changed of [{...env,SITE_ORIGIN:'https://other.test'},{...env,INICIS_MID:'OTHER'}]) assert.equal(await verifyInicisState(changed,order,state),false);
  assert.equal(await verifyInicisState(env,order,await inicisState(env,order,Date.now()-1)),false);
  assert.equal(await verifyInicisState(env,order,state.slice(0,-1)+(state.endsWith('0')?'1':'0')),false);
});
test('exact vendor endpoints and deployment center are mandatory',()=>{
  assert.equal(inicisEndpoints(env,body).auth,body.authUrl);
  for(const authUrl of [body.authUrl+'?x=1',body.authUrl+'/',body.authUrl.replace('stg','fc'),'https://evil.inicis.com/api/payAuth','https://stgstdpay.inicis.com.evil.test/api/payAuth']) assert.throws(()=>inicisEndpoints(env,{...body,authUrl}));
  assert.throws(()=>inicisEndpoints({...env,INICIS_ENV:'live'},body));
  assert.throws(()=>inicisEndpoints(env,{...body,netCancelUrl:'https://evil.test'}));
});
test('approval must match MID, amount, order, method, result and transaction',()=>{
  assert.ok(validateInicisApproval(env,order,response));
  for(const change of [{mid:'OTHER'},{MOID:'OTHER'},{TotPrice:'59000.0'},{TotPrice:'1'},{tid:''},{payMethod:'VBank'},{resultCode:'9999'}]) assert.equal(validateInicisApproval(env,order,{...response,...change}),false);
});
test('simultaneous returns send exactly one approval request',async()=>{
  const local=database();let requests=0;
  const fetcher=async()=>{requests++;await new Promise(r=>setTimeout(r,10));return json(response);};
  const results=await Promise.all([1,2,3].map(()=>processInicisApproval({...env,DB:local.DB},order,body,local.capture,fetcher)));
  assert.equal(requests,1);assert.equal(results.filter(x=>x.status==='paid').length,1);
  assert.equal(results.filter(x=>x.duplicate).length,2);local.db.close();
});
for(const failure of ['timeout','malformed','wrong-mid','database']) test(failure+' compensates once and prevents repeat approval',async()=>{
  const local=database();const calls=[];
  const fetcher=async(url)=>{calls.push(url);if(url.endsWith('netCancel'))return json({...response});
    if(failure==='timeout')throw Error('network');if(failure==='malformed')return new Response('bad');return json({...response,...(failure==='wrong-mid'?{mid:'OTHER'}:{})});};
  const capture=failure==='database'?async()=>{throw Error('disk');}:local.capture;
  assert.equal((await processInicisApproval({...env,DB:local.DB},order,body,capture,fetcher)).status,'net_cancelled');
  assert.equal((await processInicisApproval({...env,DB:local.DB},order,body,capture,fetcher)).duplicate,true);
  assert.deepEqual(calls,[body.authUrl,body.netCancelUrl]);local.db.close();
});
test('unconfirmed compensation remains review, not failed/retryable',async()=>{
  const local=database();const result=await processInicisApproval({...env,DB:local.DB},order,body,local.capture,async()=>{throw Error('network')});
  assert.equal(result.status,'review');assert.equal(local.db.prepare('SELECT status FROM payment_pg_attempts').get().status,'review');local.db.close();
});
test('lost capture response after commit never cancels paid service',async()=>{
  const local=database();let requests=0;
  const result=await processInicisApproval({...env,DB:local.DB},order,body,async()=>{await local.capture();throw Error('lost response');},async()=>{requests++;return json(response);});
  assert.equal(result.status,'paid');assert.equal(requests,1);local.db.close();
});
test('explicit PG rejection is retained without network cancellation',async()=>{
  const local=database();let requests=0;
  assert.equal((await processInicisApproval({...env,DB:local.DB},order,body,local.capture,async()=>{requests++;return json({resultCode:'FAIL'});})).status,'rejected');
  assert.equal(requests,1);local.db.close();
});
