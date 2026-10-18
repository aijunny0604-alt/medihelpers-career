import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inicisCloseResponse, paymentCanonicalRedirect, inicisRequestParams} from './inicisStandard.js';

test('PC payment close is the official iframe closer, not a frame-blocked SPA', async () => {
  for (const mode of ['test','live']) {
    const r= inicisCloseResponse(new Request('https://www.medihelpers.co.kr/api/payment-close'),{INICIS_ENV:mode});
    assert.equal(r.status,200); assert.equal(r.headers.get('cache-control'),'no-store');
    assert.match(r.headers.get('content-security-policy'),/frame-ancestors 'self'/);
    const body=await r.text();
    assert.ok(body.includes('https://'+(mode==='test'?'stgstdpay':'stdpay')+'.inicis.com/stdjs/INIStdPay_close.js'));
    assert.ok(!body.includes('/mypage')); assert.ok(!body.includes('payment=paid'));
  }
});
test('close does not echo callback input or create a payment',async()=>{
  const r=inicisCloseResponse(new Request('https://site.test/api/payment-close?next=https://evil.test',{method:'POST',body:'resultCode=0000&password=secret'}),{});
  assert.ok(!(await r.text()).includes('secret'));
  assert.equal(await inicisCloseResponse(new Request('https://site.test/api/payment-close',{method:'HEAD'}),{}).text(),'');
  assert.equal(inicisCloseResponse(new Request('https://site.test/api/payment-close',{method:'DELETE'}),{}).status,405);
});
test('www alias canonicalization preserves route/query without replaying payment/API POST',()=>{
  const env={SITE_ORIGIN:'https://www.medihelpers.co.kr'};
  const r=paymentCanonicalRedirect(new Request('https://medihelpers.co.kr/ads?product=basic'),env);
  assert.equal(r.status,308); assert.equal(r.headers.get('location'),'https://www.medihelpers.co.kr/ads?product=basic');
  for (const url of ['https://www.medihelpers.co.kr/ads','https://evil.test/ads','https://medihelpers.co.kr/api/account']) assert.equal(paymentCanonicalRedirect(new Request(url),env),null);
  assert.equal(paymentCanonicalRedirect(new Request('https://medihelpers.co.kr/api/payment-approve',{method:'POST',body:'token=secret'}),env),null);
});
test('PC request uses same origin dedicated close and approval endpoints',async()=>{
  const p=await inicisRequestParams({INICIS_ENV:'live',INICIS_MID:'UPmedihelp',INICIS_SIGN_KEY:'synthetic-only',SITE_ORIGIN:'https://www.medihelpers.co.kr',INICIS_TAX_CONTRACT:'exempt',PAYMENT_PRODUCT_TAX_JSON:'{"basic":"exempt"}'},{productId:'basic',orderNumber:'LOCAL-TEST-1',amount:59000,productName:'Synthetic'});
  assert.equal(p.live,true); assert.equal(p.closeUrl,'https://www.medihelpers.co.kr/api/payment-close');
  assert.equal(p.returnUrl,'https://www.medihelpers.co.kr/api/payment-approve');
});
