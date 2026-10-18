import test from 'node:test';
import assert from 'node:assert/strict';
import { talentCreditUsage } from './talentCredits.js';

test('pending, used, held, ended and fully refunded quantities remain distinct',()=>{
  const pool={total:10,used:2};
  assert.equal(talentCreditUsage({status:'awaiting_payment'},null,10).state,'unpaid');
  assert.equal(talentCreditUsage({status:'paid'},null,10).state,'pending');
  assert.equal(talentCreditUsage({status:'paid'},pool,10).remaining,8);
  assert.deepEqual(talentCreditUsage({status:'paid',refundPending:1},pool,10),{purchased:10,issued:10,used:2,remaining:0,held:8,ended:false,state:'held'});
  assert.equal(talentCreditUsage({status:'partially_refunded'},pool,10).remaining,0);
  assert.equal(talentCreditUsage({status:'partially_refunded'},pool,10).used,2);
  assert.equal(talentCreditUsage({status:'refunded'},{total:10,used:10},10).used,null);
  assert.equal(talentCreditUsage({status:'paid'},{grants:1,total:null},1).used,1);
  assert.equal(talentCreditUsage({status:'paid'},{total:10,used:10},10).remaining,0);
  assert.equal(talentCreditUsage({status:'paid'},{total:10,used:11},10).remaining,0);
  assert.equal(talentCreditUsage({status:'paid'},pool,undefined),null);
});
