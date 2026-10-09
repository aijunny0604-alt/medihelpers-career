import test from 'node:test';
import assert from 'node:assert/strict';
import { serviceFailure } from './serviceFailure.js';

test('daily D1 limit is unavailable until next UTC midnight without internal details', () => {
  const error = new Error("D1_ERROR: Your account has exceeded D1's free tier daily row read limit. private SQL");
  const result = serviceFailure(error, Date.parse('2026-10-09T14:00:00Z'));
  assert.equal(result.status, 503);
  assert.equal(result.headers['Retry-After'], '36000');
  assert.equal(result.body.retryAt, '2026-10-10T00:00:00.000Z');
  assert.equal(result.headers['Cache-Control'], 'no-store');
  assert.doesNotMatch(JSON.stringify(result), /private SQL|D1_ERROR/);
});
test('wrapped write limit and midnight boundary', () => {
  const cause = new Error("D1_ERROR: Your account has exceeded D1's free tier daily row write limit.");
  assert.equal(serviceFailure(new Error('query failed', { cause }), Date.parse('2026-10-09T23:59:59.999Z')).headers['Retry-After'], '1');
  assert.equal(serviceFailure(cause, Date.parse('2026-10-10T00:00:00Z')).headers['Retry-After'], '86400');
});
test('ordinary DB failures and cyclic causes are not misclassified', () => {
  const cyclic = new Error('D1 query failed'); cyclic.cause = cyclic;
  for (const error of [cyclic, new Error('daily row read limit'), new Error('D1_ERROR: no such table'), null]) assert.equal(serviceFailure(error), null);
});
