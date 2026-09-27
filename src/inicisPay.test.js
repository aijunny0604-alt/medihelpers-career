import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inicisPaymentChannel,openInicisPayment} from './inicisPay.js';
test('payment device detection supports mobile and desktop-mode iPad',()=>{
 for(const nav of [{userAgent:'iPhone'},{userAgent:'Android Mobile'},{userAgent:'Macintosh Safari',platform:'MacIntel',maxTouchPoints:5}])assert.equal(inicisPaymentChannel(nav),'mobile');
 for(const nav of [{userAgent:'Windows Chrome'},{userAgent:'Macintosh',platform:'MacIntel',maxTouchPoints:0},undefined])assert.equal(inicisPaymentChannel(nav),'pc');
});
test('mobile checkout posts hidden fields to exact provider without PC script',async()=>{
 const original=globalThis.document;let posted=null;
 globalThis.document={createElement:tag=>({tag,children:[],style:{},appendChild(e){this.children.push(e);},submit(){posted=this;}}),body:{appendChild(){}},head:{appendChild(){throw Error('PC script should not load');}}};
 try {
  const p={configured:true,mobile:true,returnUrl:'https://audit.local/api/payment-approve',action:'https://mobile.inicis.com/smart/payment/',fields:{P_CHKFAKE:'synthetic',P_AMT:'59000',P_GOODS:'<테스트>'}};
  await openInicisPayment(p);assert.equal(posted.method,'POST');assert.equal(posted.target,'_self');assert.equal(posted.acceptCharset,'euc-kr');assert.equal(posted.children.find(e=>e.name==='P_GOODS').value,'<테스트>');
  posted=null;await assert.rejects(openInicisPayment({...p,action:'https://evil.test/'}));assert.equal(posted,null);
 } finally {globalThis.document=original;}
});
