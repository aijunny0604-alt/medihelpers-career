import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mainSource = readFileSync(new URL('./main.jsx', import.meta.url), 'utf8');
const serverSource = readFileSync(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8');
const devMockSource = readFileSync(new URL('./devApiMock.js', import.meta.url), 'utf8');

test('공고 등록 화면은 실제 로그인된 병원 회원에게만 열린다', () => {
  const helper = mainSource.slice(
    mainSource.indexOf('function isActiveHospitalMember'),
    mainSource.indexOf('function useSiteCategories'),
  );
  const applyPage = mainSource.slice(
    mainSource.indexOf('function AdvertiseApplyPage'),
    mainSource.indexOf('function AboutPage'),
  );

  assert.match(helper, /auth\?\.status === 'member'/);
  assert.match(helper, /auth\?\.account\?\.role === 'hospital'/);
  assert.match(helper, /auth\?\.role === 'hospital'/);
  assert.match(helper, /!auth\?\.isAdmin/);
  assert.match(applyPage, /isActiveHospitalMember\(adAuth\)/);
  assert.match(applyPage, /<Checkout plan=\{plan\} auth=\{adAuth\} \/>/);
});

test('열려 있던 공고 입력 화면도 로그아웃 뒤에는 업로드와 주문을 시작하지 않는다', () => {
  const checkout = mainSource.slice(
    mainSource.indexOf('function Checkout'),
    mainSource.indexOf('function TalentUnlockCheckout'),
  );
  const guardIndex = checkout.indexOf('if (!isActiveHospitalMember(auth))');
  const uploadIndex = checkout.indexOf('uploadJobImage(brandFile');
  const orderIndex = checkout.indexOf('fetch("/api/payment-orders"');

  assert.notEqual(guardIndex, -1);
  assert.ok(guardIndex < uploadIndex);
  assert.ok(guardIndex < orderIndex);
  assert.match(checkout, /로그인한 병원 회원만 공고를 등록할 수 있습니다/);
});

test('서버는 비회원·다른 역할을 거절하고 병원회원은 승인 대기 없이 광고 주문을 만든다', () => {
  const paymentApi = serverSource.slice(
    serverSource.indexOf('async function paymentOrderApi'),
    serverSource.indexOf('async function paymentApproveApi'),
  );

  assert.match(paymentApi, /if \(!identity\).*401/);
  assert.match(paymentApi, /product\.type === 'doctor_ad' && account\.role !== 'hospital'/);
  assert.match(paymentApi, /병원 회원만 공고 상품을 신청할 수 있습니다/);
  assert.doesNotMatch(paymentApi, /verificationStatus !== 'verified'/);
  assert.doesNotMatch(serverSource, /credential\.role === 'hospital' && credential\.verificationStatus !== 'verified'/);
});

test('로컬 가상 API도 운영 서버와 같은 로그인·병원 역할 검사를 적용한다', () => {
  const paymentMock = devMockSource.slice(
    devMockSource.indexOf("if (path === '/api/payment-orders'"),
    devMockSource.indexOf('// 결제 승인(가상)'),
  );

  assert.match(paymentMock, /read\(LS\.authSession, null\)/);
  assert.match(paymentMock, /if \(!session\?\.email\).*401/);
  assert.match(paymentMock, /session\.role !== 'hospital'/);
});
