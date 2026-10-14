import test from 'node:test';
import assert from 'node:assert/strict';
import { manualRefundEvidence } from './manualInicisRefund.js';

const verify = canceledAt => manualRefundEvidence({evidence:{confirmed:true,tid:'synthetic',amount:1000,reference:'synthetic evidence',canceledAt}}, {totalAmount:1000}, {tid:'synthetic'}, Date.parse('2026-10-14T00:00:00Z'));
for (const value of ['2026-02-30T12:00:00Z','2025-02-29T12:00:00Z','2026-04-31T12:00:00+09:00','2026-10-01T24:00:00Z','2026-10-01T12:00:00','2026-10-01','2026-10-01T12:00:00+24:00','2026-10-01T12:00:00+09:60',null,12345]) {
  test('reject ambiguous or impossible cancellation time '+JSON.stringify(value), () => {
    assert.throws(() => verify(value), /MANUAL_REFUND_EVIDENCE_INVALID/);
  });
}
test('explicit Korean and UTC timestamps identify the same instant', () => {
  assert.equal(verify('2026-10-01T12:00:00+09:00').canceledAt, verify('2026-10-01T03:00:00Z').canceledAt);
});
test('valid leap day and milliseconds are preserved', () => {
  assert.equal(verify('2024-02-29T12:00:00.123Z').canceledAt, '2024-02-29T12:00:00.123Z');
});
