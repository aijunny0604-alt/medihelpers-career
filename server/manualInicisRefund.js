// Operator attestation of a cancellation already completed in the merchant console.
// This is deliberately NOT a PG response verification or a request to move money.
function explicitInstant(value) {
  if (typeof value !== 'string') return NaN;
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.\d{1,3})?(Z|[+-](\d{2}):(\d{2}))$/.exec(value);
  if (!match) return NaN;
  const calendar = Date.parse(match[1] + 'Z');
  // Date.parse normalizes impossible dates (for example February 30).
  if (!Number.isFinite(calendar) || new Date(calendar).toISOString().slice(0, 19) !== match[1]
    || (match[2] !== 'Z' && (Number(match[3]) > 23 || Number(match[4]) > 59))) return NaN;
  return Date.parse(value);
}

export function manualRefundEvidence(body, refund, capture, now = Date.now()) {
  const evidence = body.evidence || {};
  const canceledAt = explicitInstant(evidence.canceledAt);
  const already = Number(refund.refundedAmount || 0);
  const remaining = Number(refund.totalAmount) - already;
  const partial = evidence.amount < remaining || already > 0;
  const cancellationTid = String(evidence.cancellationTid || (partial ? '' : capture.tid)).trim();
  const customerMessage = String(evidence.customerMessage || '').trim();
  if (evidence.confirmed !== true || typeof evidence.tid !== 'string' || evidence.tid !== capture.tid
    || !Number.isSafeInteger(evidence.amount) || evidence.amount <= 0 || evidence.amount > remaining
    || !Number.isSafeInteger(already) || already < 0 || !Number.isSafeInteger(remaining) || remaining <= 0
    || (evidence.remainingAmount !== undefined && evidence.remainingAmount !== remaining - evidence.amount)
    || !/^[A-Za-z0-9_-]{4,100}$/.test(cancellationTid) || (partial && cancellationTid === capture.tid)
    || (partial && (evidence.remainingAmount !== remaining - evidence.amount || customerMessage.length < 5))
    || customerMessage.length > 1000
    || !Number.isFinite(canceledAt) || canceledAt > now || canceledAt < Date.parse('2000-01-01')
    || typeof evidence.reference !== 'string' || evidence.reference.trim().length < 5 || evidence.reference.length > 200) {
    throw new Error('MANUAL_REFUND_EVIDENCE_INVALID');
  }
  return {verification:'operator_attestation',tid:capture.tid,cancellationTid,amount:evidence.amount,
    remainingAmount:remaining-evidence.amount,refundedAmount:already+evidence.amount,
    customerMessage:customerMessage || '결제 금액 전액의 취소 완료를 확인했습니다.',
    canceledAt:new Date(canceledAt).toISOString(),reference:evidence.reference.trim()};
}

export function refundResultStatements(env, refund, message, kind) {
  if (!refund.accountId) return [];
  const title = kind === 'rejected' ? '환불 요청이 반려되었습니다' : kind === 'partial' ? '부분 환불 처리가 완료되었습니다' : '전액 환불 처리가 완료되었습니다';
  return [
    env.DB.prepare("INSERT INTO member_notifications (id,account_id,kind,title,body,action_url) VALUES (?,?,'refund_result',?,?,?)")
      .bind('refund-result-'+refund.id,refund.accountId,title,message,'/mypage?tab=payments&order='+encodeURIComponent(refund.orderNumber)),
    env.DB.prepare("INSERT INTO member_activity (id,account_id,event_type,title,detail) VALUES (?,?,'refund_result',?,?)")
      .bind('refund-result-'+refund.id,refund.accountId,title,message)
  ];
}

export async function rejectRefundRequest(env, refund, reason, actor) {
  // Event primary key + NOT NULL guard make rejection, audit and notification atomic.
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO payment_events (id,order_id,actor_key,event_type,detail_json)
      VALUES (?,?,?,CASE WHEN EXISTS(SELECT 1 FROM payment_refunds WHERE id=? AND status='requested')
        AND NOT EXISTS(SELECT 1 FROM payment_pg_refunds WHERE order_id=? AND status<>'manual_completed')
        THEN 'refund_rejected' ELSE NULL END,?)`)
      .bind('refund-rejected-'+refund.id,refund.orderId,actor,refund.id,refund.orderId,JSON.stringify({refundId:refund.id,customerMessage:reason})),
    // Original deployed tables allow 'cancelled', but not 'rejected'. The immutable
    // refund_rejected event distinguishes an operator rejection in both read APIs.
    env.DB.prepare("UPDATE payment_refunds SET status='cancelled',processed_at=CURRENT_TIMESTAMP WHERE id=?").bind(refund.id),
    ...refundResultStatements(env,refund,'주문 '+refund.orderNumber+' · '+reason,'rejected')
  ]);
}

export async function recordManualInicisRefund(env, refund, capture, evidence, actor, revokeStatements) {
  const meta = JSON.parse(refund.metadataJson || '{}'); delete meta.exposure;
  const full = evidence.remainingAmount === 0;
  meta.refundServiceEnded = true;
  const already = Number(refund.refundedAmount || 0);
  const usage = await env.DB.prepare('SELECT COALESCE(SUM(used_credits),0) AS used,COALESCE(SUM(total_credits),0) AS total FROM talent_credit_pools WHERE order_id=?').bind(refund.orderId).first();
  // The first INSERT is an atomic guard. NOT NULL failure or a competing per-order
  // PG claim rolls back the entire D1 batch, including rights and the audit event.
  // Metadata must still match the snapshot used to compute ad hiding and exposure
  // removal; otherwise a concurrent edit would be overwritten by stale JSON.
  await env.DB.batch([
    // Only completed manual claims can be replaced for another partial refund.
    // An unknown/in-progress automatic cancellation must always block this path.
    env.DB.prepare("DELETE FROM payment_pg_refunds WHERE order_id=? AND status='manual_completed' AND refund_id<>?").bind(refund.orderId,refund.id),
    env.DB.prepare(`INSERT INTO payment_pg_refunds (order_id,refund_id,status)
      VALUES (?,?,CASE WHEN EXISTS (
        SELECT 1 FROM payment_orders o JOIN payment_refunds r ON r.order_id=o.id
        WHERE o.id=? AND r.id=? AND o.status IN ('paid','partially_refunded') AND r.status='requested'
          AND o.metadata_json=?
          AND o.total_amount=? AND r.amount IN (0,?)
          AND (SELECT COALESCE(SUM(amount),0) FROM payment_refunds WHERE order_id=o.id AND status='succeeded')=?
          AND (SELECT COALESCE(SUM(amount),0) FROM payment_transactions WHERE order_id=o.id AND transaction_type='refund' AND status='succeeded')=?
          AND NOT EXISTS (SELECT 1 FROM payment_transactions WHERE provider='inicis' AND transaction_type='refund' AND status='succeeded' AND provider_transaction_id=?)
          AND (SELECT COALESCE(SUM(used_credits),0) FROM talent_credit_pools WHERE order_id=o.id)=?
          AND o.payment_method='card' AND (o.paid_at IS NULL OR datetime(o.paid_at)<=datetime(?))
          AND (SELECT COUNT(*) FROM payment_transactions WHERE order_id=o.id AND transaction_type='capture' AND status='succeeded')=1
          AND EXISTS (SELECT 1 FROM payment_transactions WHERE order_id=o.id AND transaction_type='capture' AND status='succeeded' AND provider='inicis' AND provider_transaction_id=? AND amount=o.total_amount)
      ) THEN 'manual_completed' ELSE NULL END)`)
      .bind(refund.orderId,refund.id,refund.orderId,refund.id,refund.metadataJson,refund.totalAmount,evidence.amount,already,already,evidence.cancellationTid,usage.used,evidence.canceledAt,capture.tid),
    env.DB.prepare("UPDATE payment_orders SET status=?,metadata_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(full?'refunded':'partially_refunded',JSON.stringify(meta),refund.orderId),
    // Member requests start at 0 (amount not yet determined). Only a guarded
    // operator confirmation sets the final amount; no PG request is made here.
    env.DB.prepare("UPDATE payment_refunds SET status='succeeded',amount=?,provider_refund_id=?,processed_at=CURRENT_TIMESTAMP WHERE id=?").bind(evidence.amount,evidence.cancellationTid,refund.id),
    env.DB.prepare("INSERT INTO payment_transactions (id,order_id,transaction_type,provider,provider_transaction_id,amount,status,processed_at) VALUES (?,?,'refund','inicis',?,?,'succeeded',CURRENT_TIMESTAMP)").bind('inicis-manual-refund-'+refund.id,refund.orderId,evidence.cancellationTid,evidence.amount),
    // Partial: preserve the historical usage counter and paid unlocks. The order's
    // refundServiceEnded flag blocks future debits without expiring legacy packs.
    ...(full ? revokeStatements : []),
    ...(meta.contentRecordId ? [env.DB.prepare("UPDATE admin_content_records SET status='hidden',updated_at=CURRENT_TIMESTAMP WHERE id=? AND NOT EXISTS (SELECT 1 FROM payment_orders WHERE id<>? AND status='paid' AND json_extract(metadata_json,'$.contentRecordId')=? AND json_extract(metadata_json,'$.exposure.end')>=date('now'))").bind(meta.contentRecordId,refund.orderId,meta.contentRecordId)] : []),
    env.DB.prepare("INSERT INTO payment_events (id,order_id,actor_key,event_type,detail_json) VALUES (?,?,?,'inicis_manual_refund_recorded',?)").bind('inicis-manual-refund-event-'+refund.id,refund.orderId,actor,JSON.stringify({...evidence,refundId:refund.id,serviceEnded:true,preservedUsedAccess:!full,usage})),
    ...refundResultStatements(env,refund,'주문 '+refund.orderNumber+' · '+evidence.amount.toLocaleString('ko-KR')+'원 환불 · '+evidence.customerMessage,full?'full':'partial')
  ]);
}
