// Read-only queue. A local attempt state is not proof of a PG approval or cancellation.
export async function readPaymentExceptions(db) {
  const result = await db.prepare(`WITH unresolved AS (
    SELECT order_id, 'approval' AS kind, status, updated_at AS updatedAt
      FROM payment_pg_attempts WHERE status IN ('approving','review')
    UNION ALL
    SELECT order_id, 'refund' AS kind, status, updated_at AS updatedAt
      FROM payment_pg_refunds WHERE status IN ('processing','review','provider_confirmed')
  ) SELECT u.kind,u.status,u.updatedAt,o.order_number AS orderNumber,
      o.total_amount AS amount,o.status AS orderStatus,
      (SELECT provider_transaction_id FROM payment_transactions t
       WHERE t.order_id=o.id AND t.provider='inicis' AND t.transaction_type='capture'
         AND t.status='succeeded' ORDER BY t.processed_at,t.id LIMIT 1) AS tid,
      COUNT(*) OVER () AS total
    FROM unresolved u JOIN payment_orders o ON o.id=u.order_id
    ORDER BY u.updatedAt,o.order_number,u.kind LIMIT 100`).all();
  const rows=result.results || [];
  return {total:Number(rows[0]?.total || 0),items:rows.map(({total,...row})=>row)};
}
