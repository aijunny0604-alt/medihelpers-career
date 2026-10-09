// Operator attestation of a cancellation already completed in the merchant console.
// This is deliberately NOT a PG response verification or a request to move money.
export function manualRefundEvidence(body, refund, capture, now = Date.now()) {
  const evidence = body.evidence || {};
  const canceledAt = Date.parse(evidence.canceledAt);
  if (evidence.confirmed !== true || typeof evidence.tid !== 'string' || evidence.tid !== capture.tid
    || !Number.isSafeInteger(evidence.amount) || evidence.amount <= 0 || evidence.amount !== Number(refund.totalAmount)
    || !Number.isFinite(canceledAt) || canceledAt > now || canceledAt < Date.parse('2000-01-01')
    || typeof evidence.reference !== 'string' || evidence.reference.trim().length < 5 || evidence.reference.length > 200) {
    throw new Error('MANUAL_REFUND_EVIDENCE_INVALID');
  }
  return {verification:'operator_attestation',tid:capture.tid,amount:evidence.amount,
    canceledAt:new Date(canceledAt).toISOString(),reference:evidence.reference.trim()};
}

export async function recordManualInicisRefund(env, refund, capture, evidence, actor, revokeStatements) {
  const meta = JSON.parse(refund.metadataJson || '{}'); delete meta.exposure;
  // The first INSERT is an atomic guard. NOT NULL failure or a competing per-order
  // PG claim rolls back the entire D1 batch, including rights and the audit event.
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO payment_pg_refunds (order_id,refund_id,status)
      VALUES (?,?,CASE WHEN EXISTS (
        SELECT 1 FROM payment_orders o JOIN payment_refunds r ON r.order_id=o.id
        WHERE o.id=? AND r.id=? AND o.status='paid' AND r.status='requested'
          AND o.total_amount=? AND r.amount=o.total_amount
          AND o.payment_method='card' AND (o.paid_at IS NULL OR datetime(o.paid_at)<=datetime(?))
          AND (SELECT COUNT(*) FROM payment_transactions WHERE order_id=o.id AND transaction_type='capture' AND status='succeeded')=1
          AND EXISTS (SELECT 1 FROM payment_transactions WHERE order_id=o.id AND transaction_type='capture' AND status='succeeded' AND provider='inicis' AND provider_transaction_id=? AND amount=o.total_amount)
          AND NOT EXISTS (SELECT 1 FROM payment_transactions WHERE order_id=o.id AND transaction_type='refund' AND status='succeeded')
      ) THEN 'manual_completed' ELSE NULL END)`)
      .bind(refund.orderId,refund.id,refund.orderId,refund.id,evidence.amount,evidence.canceledAt,capture.tid),
    env.DB.prepare("UPDATE payment_orders SET status='refunded',metadata_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(JSON.stringify(meta),refund.orderId),
    env.DB.prepare("UPDATE payment_refunds SET status='succeeded',processed_at=CURRENT_TIMESTAMP WHERE id=?").bind(refund.id),
    env.DB.prepare("INSERT INTO payment_transactions (id,order_id,transaction_type,provider,provider_transaction_id,amount,status,processed_at) VALUES (?,?,'refund','inicis',?,?,'succeeded',CURRENT_TIMESTAMP)").bind('inicis-manual-refund-'+refund.orderId,refund.orderId,capture.tid,evidence.amount),
    ...revokeStatements,
    ...(meta.contentRecordId ? [env.DB.prepare("UPDATE admin_content_records SET status='hidden',updated_at=CURRENT_TIMESTAMP WHERE id=? AND NOT EXISTS (SELECT 1 FROM payment_orders WHERE id<>? AND status='paid' AND json_extract(metadata_json,'$.contentRecordId')=? AND json_extract(metadata_json,'$.exposure.end')>=date('now'))").bind(meta.contentRecordId,refund.orderId,meta.contentRecordId)] : []),
    env.DB.prepare("INSERT INTO payment_events (id,order_id,actor_key,event_type,detail_json) VALUES (?,?,?,'inicis_manual_refund_recorded',?)").bind('inicis-manual-refund-event-'+refund.orderId,refund.orderId,actor,JSON.stringify({...evidence,refundId:refund.id}))
  ]);
}
