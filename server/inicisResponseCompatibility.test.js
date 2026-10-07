import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inicisPost, inicisMobilePost, validateInicisApproval, validateInicisMobileApproval} from './inicisStandard.js';

// Inicis notice 9640 (2026-10-02): parse by key, tolerate new fields/order.
// Synthetic responses only; this does not certify a live merchant transaction.
const env = {INICIS_MID:'INIpayTest'};
const order = {orderNumber:'SYNTHETIC-ORDER',amount:1000};
const pc = {resultCode:'0000',mid:env.INICIS_MID,MOID:order.orderNumber,TotPrice:'1000',payMethod:'Card',tid:'SYNTHETIC-TID-12345'};
const mobile = {P_STATUS:'00',P_MID:env.INICIS_MID,P_OID:order.orderNumber,P_AMT:'1000',P_TYPE:'CARD',P_TID:'INIMX_CARD'+env.INICIS_MID+'20261007123456789012'};
const fetchText = text => async () => new Response(text);

for (const format of ['pc-json','mobile-json','mobile-form']) {
  test(`${format}: reordered response and additional fields preserve approval checks`,async()=>{
    const original = format==='pc-json' ? pc : mobile;
    const reordered = Object.fromEntries([['new_vendor_field','a=b&c'],...Object.entries(original).reverse()]);
    const parser = format==='pc-json' ? inicisPost : inicisMobilePost;
    const validate = format==='pc-json' ? validateInicisApproval : validateInicisMobileApproval;
    const encode = value => format==='mobile-form' ? new URLSearchParams(value).toString() : JSON.stringify(value);
    const parsed = await parser('https://synthetic.invalid',{},fetchText(encode(reordered)));
    assert.equal(parsed.new_vendor_field,'a=b&c');
    assert.equal(validate(env,order,parsed),true);
    const priceKey = format==='pc-json' ? 'TotPrice' : 'P_AMT';
    assert.equal(validate(env,order,{...parsed,[priceKey]:'1'}),false);
    const missing = {...parsed}; delete missing[priceKey];
    assert.equal(validate(env,order,missing),false);
  });
}

test('mobile form: duplicate critical fields remain rejected despite extensibility',async()=>{
  const payload = new URLSearchParams(mobile).toString()+'&P_AMT=1';
  await assert.rejects(inicisMobilePost('https://synthetic.invalid',{},fetchText(payload)),/PG_RESPONSE_INVALID/);
});
