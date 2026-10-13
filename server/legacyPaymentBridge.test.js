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
