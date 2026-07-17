import test from 'node:test';
import assert from 'node:assert/strict';
import { QA_STATE_OPTIONS, getQaStateInfo, normalizeQaState, qaCanViewPrivateDetails, qaHasMembership } from './qaPreview.js';

test('QA 미리보기는 정확히 5개 상태를 제공한다', () => {
  assert.deepEqual(QA_STATE_OPTIONS.map((option) => option.id), ['guest', 'admin', 'hospital', 'doctor', 'doctor-member']);
});

test('알 수 없는 상태는 저장하지 않고 비로그인 정보로 안전하게 처리한다', () => {
  assert.equal(normalizeQaState('root-superuser'), '');
  assert.equal(getQaStateInfo('root-superuser').id, 'guest');
});

test('관리자와 인증 의사는 구독 여부와 관계없이 상세조건을 미리 볼 수 있다', () => {
  assert.equal(qaCanViewPrivateDetails('admin'), true);
  assert.equal(qaCanViewPrivateDetails('doctor-member'), true);
  assert.equal(qaCanViewPrivateDetails('hospital'), false);
  assert.equal(qaCanViewPrivateDetails('doctor'), true);
});

test('멤버십 활성 상태는 구독 의료인에게만 적용한다', () => {
  assert.equal(qaHasMembership('doctor-member'), true);
  assert.equal(qaHasMembership('admin'), false);
});
