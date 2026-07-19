import test from 'node:test';
import assert from 'node:assert/strict';
import { accountRoleLabel, validateSignup } from './signupModel.js';

test('accepts only the minimum required signup fields', () => {
  const result = validateSignup({
    role: 'doctor',
    termsAccepted: true,
    ageConfirmed: true,
    privacyAcknowledged: true
  });
  assert.deepEqual(result, { valid: true, errors: {} });
});

test('rejects unknown roles and missing legal confirmations', () => {
  const result = validateSignup({ role: 'admin' });
  assert.equal(result.valid, false);
  assert.deepEqual(Object.keys(result.errors).sort(), ['ageConfirmed', 'privacyAcknowledged', 'role', 'termsAccepted']);
});

test('renders stable public role labels', () => {
  assert.equal(accountRoleLabel('doctor'), '의료인 회원');
  assert.equal(accountRoleLabel('hospital'), '병원·의료기관');
  assert.equal(accountRoleLabel('unknown'), '회원');
});
