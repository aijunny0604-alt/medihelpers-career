import {test} from 'node:test';
import assert from 'node:assert/strict';
import {paymentAmounts} from './paymentAmounts.js';
test('zero VAT is preserved without recomputation',()=>assert.deepEqual(paymentAmounts({totalAmount:59000,supplyAmount:59000,taxAmount:0}),{total:59000,supply:59000,tax:0}));
test('numeric ledger strings are supported',()=>assert.deepEqual(paymentAmounts({totalAmount:'11000',supplyAmount:'10000',taxAmount:'1000'}),{total:11000,supply:10000,tax:1000}));
test('missing tax is unknown, not assumed VAT',()=>assert.deepEqual(paymentAmounts({totalAmount:59000}),{total:59000,supply:null,tax:null}));
test('inconsistent or invalid amounts require review',()=>{
 for (const taxAmount of [null,'',false,-1,NaN,0.5,100]) assert.equal(paymentAmounts({totalAmount:11000,supplyAmount:10000,taxAmount}).tax,null);
});
