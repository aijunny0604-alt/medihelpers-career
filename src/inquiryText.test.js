import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanInquiryText, isUnreadableInquiryText } from './inquiryText.js';

test('valid Korean inquiry messages remain visible', () => {
  const message = '면접 가능한 날짜를 알려주세요.';
  assert.equal(cleanInquiryText(message, 'fallback'), message);
  assert.equal(isUnreadableInquiryText(message), false);
});

test('legacy encoding damage and placeholder-only messages are hidden', () => {
  for (const message of ['??? ??? ???', '○○○○', '□□□', '���']) {
    assert.equal(isUnreadableInquiryText(message), true);
    assert.equal(cleanInquiryText(message, 'fallback'), 'fallback');
  }
});

test('a partially masked real name is not mistaken for an invalid placeholder', () => {
  assert.equal(cleanInquiryText('김○○', 'fallback'), '김○○');
});
