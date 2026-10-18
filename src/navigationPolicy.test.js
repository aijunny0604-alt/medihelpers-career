import test from 'node:test';
import assert from 'node:assert/strict';
import { internalScreenRoute, canHandleNavigationClick } from './navigationPolicy.js';
const root = 'https://www.medihelpers.co.kr/login';
for (const path of ['/login', '/mypage?tab=payments', '/mypage/inquiries/example', '/mypage/ads/example/edit', '/medical-staff', '/jobs/admin-example', '/account/recovery?mode=password']) {
  test(`internal screen keeps document: ${path}`, () => assert.equal(internalScreenRoute(path, root), path));
}
for (const path of ['/api/payment-approve', '/pay/pay_employ.html', '/rankup_module/rankup_payment/inistdpay/close.php', '/assets/example.pdf', '/jobs#details', '#details', 'https://other.example/mypage', 'javascript:alert(1)', 'mailto:hr@medihelpers.co.kr']) {
  test(`browser retains non-SPA link: ${path}`, () => assert.equal(internalScreenRoute(path, root), null));
}
test('base path is stripped once and adjacent paths do not match', () => {
  assert.equal(internalScreenRoute('/preview/mypage?tab=profile', root, '/preview'), '/mypage?tab=profile');
  assert.equal(internalScreenRoute('/preview-other/mypage', root, '/preview'), null);
});
test('click modifiers and link attributes preserve native behavior', () => {
  const anchor = {target:'',rel:'',hasAttribute:()=>false};
  assert.equal(canHandleNavigationClick({button:0}, anchor), true);
  for (const prop of ['defaultPrevented','metaKey','ctrlKey','shiftKey','altKey']) assert.equal(canHandleNavigationClick({button:0,[prop]:true}, anchor), false);
  assert.equal(canHandleNavigationClick({button:1}, anchor), false);
  assert.equal(canHandleNavigationClick({button:0}, {...anchor,target:'_blank'}), false);
  assert.equal(canHandleNavigationClick({button:0}, {...anchor,rel:'external noreferrer'}), false);
  for (const attr of ['download','data-full-reload']) assert.equal(canHandleNavigationClick({button:0}, {...anchor,hasAttribute:name=>name===attr}), false);
});
