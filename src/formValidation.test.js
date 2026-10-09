import test from 'node:test';
import assert from 'node:assert/strict';
import { fieldValidationMessage as message } from './formValidation.js';

test('missing fields distinguish input, selection and consent', () => {
  assert.match(message({validity:{valueMissing:true}}), /비어 있습니다/);
  assert.match(message({validity:{valueMissing:true},tagName:'SELECT'}), /선택/);
  assert.match(message({validity:{valueMissing:true},type:'checkbox'}), /동의.*체크/);
});
test('password length errors explain the limit without echoing the password', () => {
  assert.equal(message({validity:{tooShort:true},minLength:8,value:'secret'}), '최소 8자 이상 입력해주세요.');
  assert.match(message({validity:{tooLong:true},maxLength:128}), /128/);
});
test('email and URL mismatch provide usable examples', () => {
  assert.match(message({validity:{typeMismatch:true},type:'email'}), /name@example.com/);
  assert.match(message({validity:{typeMismatch:true},type:'url'}), /https/);
});
test('pattern errors use field-specific requirements', () => {
  assert.equal(message({validity:{patternMismatch:true},title:'영문과 숫자를 포함해주세요.'}), '영문과 숫자를 포함해주세요.');
});
test('numeric limits and custom validation are actionable', () => {
  assert.match(message({validity:{rangeUnderflow:true},min:1}), /1 이상/);
  assert.match(message({validity:{rangeOverflow:true},max:10}), /10 이하/);
  assert.match(message({validity:{badInput:true}}), /숫자/);
  assert.equal(message({validity:{customError:true},validationMessage:'서로 일치하지 않습니다.'}), '서로 일치하지 않습니다.');
});
