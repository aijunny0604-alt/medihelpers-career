// Callers supply fixed SQL identifiers only, never request input. Public post and
// legacy résumé URLs identify the same purchased résumé, regardless of URL form.
export function talentKeyExpression(column) {
  return "COALESCE((SELECT 'resume-' || key_post.resume_id FROM job_seeker_posts key_post WHERE key_post.id=substr(" + column + ",8) AND substr(" + column + ",1,7)='seeker-'), " + column + ')';
}

export async function findTalentUnlock(env, accountId, talentId) {
  return env.DB.prepare('SELECT id, order_id AS orderId FROM talent_unlocks WHERE hospital_account_id=? AND '
    + talentKeyExpression('talent_id') + '=(SELECT ' + talentKeyExpression('target.talent_id')
    + ' FROM (SELECT ? AS talent_id) target) LIMIT 1').bind(accountId,talentId).first();
}

export function talentCreditUsage(order, pool, purchased) {
  if (!purchased) return null;
  const fullRefund = order.status === 'refunded';
  const ended = fullRefund || order.status === 'partially_refunded' || order.serviceEnded === true;
  const issued = Number(pool?.total) || Number(pool?.grants) || 0;
  const used = pool?.total != null ? Number(pool.used) || 0 : Number(pool?.grants) || 0;
  const unused = Math.max(0, issued - used);
  const held = !ended && Number(order.refundPending) > 0 ? unused : 0;
  const active = order.status === 'paid' && !ended;
  return { purchased, issued, used:fullRefund ? null : used,
    remaining:active && !held ? unused : 0, held, ended,
    state:ended ? 'ended' : !active ? 'unpaid' : !issued ? 'pending' : held ? 'held' : 'active' };
}
