import test from 'node:test';
import assert from 'node:assert/strict';
import { revealAndFocusField } from './formFocus.js';

test('접힌 선택정보의 오류는 모든 상위 details를 펼친 뒤 포커스한다', () => {
  const outer = {tagName:'DETAILS',open:false};
  const inner = {tagName:'DETAILS',open:false,parentElement:outer};
  let focused = false;
  revealAndFocusField({
    parentElement:{tagName:'FIELDSET',parentElement:inner},
    focus() { assert.equal(outer.open,true); assert.equal(inner.open,true); focused=true; },
  });
  assert.equal(focused,true);
});

test('일반 필수 입력과 파일 첨부 오류도 포커스하고 없는 필드는 무시한다', () => {
  let calls=0;
  revealAndFocusField({parentElement:{tagName:'FORM'},focus(){calls++;}});
  revealAndFocusField(null);
  assert.equal(calls,1);
});
