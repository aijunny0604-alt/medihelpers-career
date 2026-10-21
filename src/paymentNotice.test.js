import test from 'node:test';
import assert from 'node:assert/strict';
import {paymentReturnNotice} from './paymentNotice.js';

for(const [label,number,orders] of [
  ['번호 없음','',[{orderNumber:'ACTUAL',status:'paid'}]],
  ['다른 주문','URL-ORDER',[{orderNumber:'OTHER',status:'paid'}]],
  ['조회 중','URL-ORDER',[]],
  ['미결제','URL-ORDER',[{orderNumber:'URL-ORDER',status:'pending_review'}]],
  ['잘못된 상태','URL-ORDER',[{orderNumber:'URL-ORDER',status:true}]],
  ['손상된 목록','URL-ORDER',null],
  ['손상된 행','URL-ORDER',[null]],
]) test(`결제 복귀 ${label}는 주소만 보고 완료로 표시하지 않는다`,()=>{
  const notice=paymentReturnNotice(number,orders);
  assert.equal(notice.tone,'fail');
  assert.doesNotMatch(notice.title,/완료되었습니다/);
  assert.match(notice.message,/새로 결제하기 전에/);
});
test('본인의 같은 주문 paid를 확인한 뒤에만 결제 완료를 안내한다',()=>{
  assert.equal(paymentReturnNotice('ACTUAL',[{orderNumber:'ACTUAL',status:'paid'}]).tone,'ok');
});
for(const status of ['refunded','partially_refunded']) test(`${status}는 오래된 결제 복귀 주소에서도 환불 상태를 안내한다`,()=>{
  const notice=paymentReturnNotice('ACTUAL',[{orderNumber:'ACTUAL',status}]);
  assert.equal(notice.tone,'fail');assert.match(notice.title,/환불/);
});
