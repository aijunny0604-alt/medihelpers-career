import test from 'node:test';
import assert from 'node:assert/strict';
import { QA_STATE_OPTIONS, getQaStateInfo, normalizeQaState, qaCanViewPrivateDetails, qaHasTalentUnlock } from './qaPreview.js';

test('QA 미리보기는 정확히 5개 상태를 제공한다', () => {
  assert.deepEqual(QA_STATE_OPTIONS.map((option) => option.id), ['guest', 'admin', 'hospital', 'doctor', 'hospital-unlocked']);
});

test('알 수 없는 상태는 저장하지 않고 비로그인 정보로 안전하게 처리한다', () => {
  assert.equal(normalizeQaState('root-superuser'), '');
  assert.equal(getQaStateInfo('root-superuser').id, 'guest');
});

test('관리자와 열람권 보유 병원만 비공개 상세를 볼 수 있다', () => {
  assert.equal(qaCanViewPrivateDetails('admin'), true);
  assert.equal(qaCanViewPrivateDetails('hospital-unlocked'), true);
  assert.equal(qaCanViewPrivateDetails('hospital'), false);
  assert.equal(qaCanViewPrivateDetails('doctor'), false);
});

test('열람권 보유는 결제한 병원에만 적용한다', () => {
  // 의사 멤버십은 폐지됐고, 유료 열람 권한은 병원의 인재 열람권뿐이다.
  assert.equal(qaHasTalentUnlock('hospital-unlocked'), true);
  assert.equal(qaHasTalentUnlock('hospital'), false);
  assert.equal(qaHasTalentUnlock('admin'), false);
});
