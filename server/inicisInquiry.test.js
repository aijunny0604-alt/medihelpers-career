import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inquireInicisCard} from './inicisStandard.js';
const env={INICIS_ENV:'test',INICIS_MID:'INIpayTest',INICIS_API_KEY:'synthetic-only',INICIS_CLIENT_IP:'192.0.2.1'};
const tid='T'.repeat(40),order={orderNumber:'ORDER-1',totalAmount:59000,status:'paid'};
const result={resultCode:'SUCCESS',mid:env.INICIS_MID,tid,oid:order.orderNumber,price:'59000',paymethod:'Card',transactionStatus:'APPROVAL'};
const json=data=>async()=>new Response(JSON.stringify(data));
test('inquiry signs exact V2 JSON, KST time, uses fixed test endpoint and never returns PII',async()=>{
 const now=new Date('2026-10-03T00:00:00Z');
 const actual=await inquireInicisCard(env,order,tid,async(url,request)=>{
  assert.equal(url,'https://stginiapi.inicis.com/v2/pg/inquiry');assert.equal(request.redirect,'manual');assert.equal(request.method,'POST');
  const body=JSON.parse(request.body);assert.deepEqual(body.data,{tid});assert.equal(body.timestamp,'20261003090000');
  assert.equal(body.hashData,createHash('sha512').update('synthetic-onlyINIpayTestinquiry20261003090000'+JSON.stringify({tid})).digest('hex'));
  assert.equal(request.body.includes('synthetic-only'),false);
  return new Response(JSON.stringify({...result,buyerName:'PRIVATE',cardInfo:{cardNumber:'PRIVATE'}}));
 },now);
 assert.deepEqual(actual,{providerStatus:'APPROVAL',localStatus:'paid',amount:59000,matched:true,reconciliationRequired:false,checkedAt:now.toISOString()});
});
test('live inquiry uses only fixed production inquiry endpoint',async()=>{
 await inquireInicisCard({...env,INICIS_ENV:'live'},order,tid,async(url)=>{
  assert.equal(url,'https://iniapi.inicis.com/v2/pg/inquiry');return new Response(JSON.stringify(result));
 });
});
for(const change of [{mid:'OTHER'},{tid:'X'.repeat(40)},{oid:'OTHER'},{price:'1'},{price:'59000.0'},{price:null},{paymethod:'VBank'},{transactionStatus:'UNKNOWN'},{resultCode:'ERROR'}]) {
 test('inquiry rejects mismatching/unconfirmed field '+Object.keys(change)[0]+JSON.stringify(change),async()=>{
  await assert.rejects(inquireInicisCard(env,order,tid,json({...result,...change})));
 });
}
for(const status of ['paid','refunded','awaiting_payment']) for(const pgStatus of ['APPROVAL','CANCEL','PART_CANCEL']) {
 test('inquiry compares '+status+' with '+pgStatus+' without inferring partial refund',async()=>{
  const value=await inquireInicisCard(env,{...order,status},tid,json({...result,transactionStatus:pgStatus}));
  assert.equal(value.matched,(status==='paid'&&pgStatus==='APPROVAL')||(status==='refunded'&&pgStatus==='CANCEL'));
  assert.equal(value.reconciliationRequired,!value.matched);
 });
}
for(const change of [{INICIS_API_KEY:''},{INICIS_MID:''},{INICIS_ENV:'unknown'},{INICIS_CLIENT_IP:''},{INICIS_CLIENT_IP:'256.0.0.1'},{INICIS_CLIENT_IP:'2001:db8::1'}]) {
 test('inquiry missing/invalid config sends no network request '+Object.keys(change)[0]+JSON.stringify(change),async()=>{
  let calls=0;await assert.rejects(inquireInicisCard({...env,...change},order,tid,async()=>{calls++;}));assert.equal(calls,0);
 });
}
test('invalid TID/amount rejected before network',async()=>{
 let calls=0;const fetcher=async()=>{calls++;};
 await assert.rejects(inquireInicisCard(env,order,'short',fetcher));
 await assert.rejects(inquireInicisCard(env,{...order,totalAmount:-1},tid,fetcher));assert.equal(calls,0);
});
for(const failure of ['timeout','http','json','oversized']) test('inquiry '+failure+' is never a paid/cancelled result',async()=>{
 await assert.rejects(inquireInicisCard(env,order,tid,async()=>{
  if(failure==='timeout')throw new Error('timeout');
  if(failure==='http')return new Response('{}',{status:502});
  return new Response(failure==='json'?'not-json':'x'.repeat(65537));
 }));
});
