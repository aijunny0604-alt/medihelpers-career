import {test} from 'node:test';
import assert from 'node:assert/strict';
import {paymentTax, inicisRequestParams} from './inicisStandard.js';
const env={PAYMENT_LIVE:'true',INICIS_ENV:'test',INICIS_MID:'INIpayTest',INICIS_SIGN_KEY:'synthetic',SITE_ORIGIN:'https://example.com',INICIS_TAX_CONTRACT:'merchant',PAYMENT_PRODUCT_TAX_JSON:'{"ad":"taxable","resume":"exempt"}'};
test('per-product amounts always reconcile including zero VAT',()=>{
 for(const amount of [1,99,11000,59000,149000]) for(const id of ['ad','resume']) {
  const tax=paymentTax(env,id,amount);
  assert.equal(tax.supplyAmount+tax.taxAmount,amount);
  if(id==='resume') {assert.equal(tax.taxAmount,0);assert.equal(tax.taxFreeAmount,amount);}
 }
});
test('unconfirmed and incompatible PG taxation fails closed',()=>{
 for(const change of [{INICIS_TAX_CONTRACT:''},{PAYMENT_PRODUCT_TAX_JSON:''},{PAYMENT_PRODUCT_TAX_JSON:'[]'},{PAYMENT_PRODUCT_TAX_JSON:'{}'},{PAYMENT_PRODUCT_TAX_JSON:'{"ad":"unknown"}'},{INICIS_TAX_CONTRACT:'exempt'}]) assert.throws(()=>paymentTax({...env,...change},'ad',59000));
 assert.throws(()=>paymentTax(env,'constructor',59000));
});
test('PG amount fields only sent for merchant-defined tax contract',async()=>{
 const order={productId:'resume',orderNumber:'SYNTHETIC',amount:59000};
 const merchant=await inicisRequestParams(env,order);
 assert.equal(merchant.tax,'0');assert.equal(merchant.taxfree,'59000');
 const fixed=await inicisRequestParams({...env,INICIS_TAX_CONTRACT:'exempt'},order);
 assert.equal(Object.hasOwn(fixed,'tax'),false);assert.equal(Object.hasOwn(fixed,'taxfree'),false);
});
