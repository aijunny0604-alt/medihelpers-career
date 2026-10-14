import test from 'node:test';
import assert from 'node:assert/strict';
import {legacyPaymentBridge} from './legacyPaymentBridge.js';
const path='/rankup_module/rankup_payment/inistdpay/INIStdPayReturn.php';
const enabled={LEGACY_PAYMENT_BRIDGE_ENABLED:'true'};
test('disabled bridge never forwards',async()=>assert.equal(await legacyPaymentBridge(new Request('https://www.medihelpers.co.kr'+path),{},()=>{throw Error('unexpected')}),null));
test('only confirmed exact hosts and paths are candidates',async()=>{
 for(const url of ['https://outside.invalid'+path,'http://www.medihelpers.co.kr'+path,'https://www.medihelpers.co.kr/RAD/index.html','https://www.medihelpers.co.kr'+path+'/extra','https://www.medihelpers.co.kr'+path.toLowerCase()])
  assert.equal(await legacyPaymentBridge(new Request(url),enabled,()=>{throw Error('unexpected')}),null);
});
test('preserves body and legacy session, strips new credentials, refuses redirect following',async()=>{
 let calls=0;
 const r=await legacyPaymentBridge(new Request('https://www.medihelpers.co.kr'+path+'?x=1',{method:'POST',headers:{cookie:'mh_session=private; PHPSESSID=legacy123',authorization:'Bearer private','content-type':'application/x-www-form-urlencoded'},body:'authToken=synthetic'}),enabled,async req=>{
  calls++; assert.equal(req.url,'https://www.medihelpers.co.kr'+path+'?x=1');
  assert.equal(await req.text(),'authToken=synthetic');assert.equal(req.headers.get('cookie'),'PHPSESSID=legacy123');assert.equal(req.headers.get('authorization'),null);assert.equal(req.redirect,'manual');
  return new Response('legacy response',{headers:{'set-cookie':'mh_session=untrusted','cache-control':'public'}});
 });
 assert.equal(calls,1);assert.equal(await r.text(),'legacy response');assert.equal(r.headers.get('set-cookie'),null);assert.equal(r.headers.get('cache-control'),'no-store');
});
test('origin failure is ambiguous, never automatically retried',async()=>{
 let calls=0;const r=await legacyPaymentBridge(new Request('https://www.medihelpers.co.kr'+path,{method:'POST',body:'synthetic'}),enabled,async()=>{calls++;throw Error('timeout')});
 assert.equal(calls,1);assert.equal(r.status,502);assert.match(await r.text(),/재결제하지 말고/);
});
test('other methods cannot forward',async()=>assert.equal((await legacyPaymentBridge(new Request('https://www.medihelpers.co.kr'+path,{method:'DELETE'}),enabled,()=>{throw Error('unexpected')})).status,405));

for (const status of [307,308]) test('POST '+status+' cannot replay approval data in the browser',async()=>{
 for(const location of ['https://outside.invalid/receive','https://www.medihelpers.co.kr'+path,path]) {
  let calls=0,cancelled=false;
  const body=new ReadableStream({cancel(){cancelled=true;}});
  const response=await legacyPaymentBridge(new Request('https://www.medihelpers.co.kr'+path,{method:'POST',body:'synthetic-token'}),enabled,async()=>{
   calls++;return new Response(body,{status,headers:{location,'set-cookie':'PHPSESSID=untrusted'}});
  });
  assert.equal(calls,1);assert.equal(cancelled,true);assert.equal(response.status,502);
  assert.equal(response.headers.get('location'),null);assert.equal(response.headers.get('set-cookie'),null);
  assert.equal(response.headers.get('cache-control'),'no-store');assert.match(await response.text(),/재결제하지 말고/);
 }
});

test('POST 303 receipt redirect does not replay the approval body',async()=>{
 const response=await legacyPaymentBridge(new Request('https://www.medihelpers.co.kr'+path,{method:'POST',body:'synthetic-token'}),enabled,async()=>new Response(null,{status:303,headers:{location:'/receipt'}}));
 assert.equal(response.status,303);assert.equal(response.headers.get('location'),'/receipt');
});

test('GET and HEAD redirects retain ordinary navigation behavior',async()=>{
 for(const method of ['GET','HEAD']) {
  const response=await legacyPaymentBridge(new Request('https://www.medihelpers.co.kr'+path,{method}),enabled,async()=>new Response(null,{status:307,headers:{location:'/receipt'}}));
  assert.equal(response.status,307);assert.equal(response.headers.get('location'),'/receipt');
 }
});
