import test from 'node:test';
import assert from 'node:assert/strict';
import { commerceSchemaStatements } from '../db/schema.js';

const schema = commerceSchemaStatements.join('\n');

test('회원 운영 정보는 계정 상태와 자격 인증 상태를 별도 보관한다', () => {
  assert.match(schema, /account_admin_profiles/);
  for (const field of ['status', 'verification_status', 'last_login_at', 'admin_note', 'updated_by']) {
    assert.match(schema, new RegExp(field));
  }
});

test('결제 주문은 공급가·부가세·총액과 회원·상품·상태를 연결한다', () => {
  assert.match(schema, /payment_orders/);
  for (const field of ['account_id', 'product_type', 'product_id', 'supply_amount', 'tax_amount', 'total_amount', 'payment_method']) {
    assert.match(schema, new RegExp(field));
  }
  for (const status of ['pending_review', 'awaiting_payment', 'paid', 'failed', 'cancelled', 'partially_refunded', 'refunded']) {
    assert.match(schema, new RegExp(status));
  }
});

test('승인·실패·환불·영수증·웹훅·감사 이벤트를 주문 원장과 분리해 보존한다', () => {
  for (const table of ['payment_transactions', 'payment_refunds', 'payment_receipts', 'payment_events', 'payment_webhook_events']) {
    assert.match(schema, new RegExp(table));
  }
  assert.match(schema, /provider_transaction_id/);
  assert.match(schema, /failure_code/);
  assert.match(schema, /receipt_number/);
  assert.match(schema, /from_status/);
  assert.match(schema, /to_status/);
  assert.match(schema, /signature_verified/);
  assert.match(schema, /provider_event_id/);
});
