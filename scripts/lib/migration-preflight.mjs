// Read-only validation of a normalized export. Never emits PII or writes to a DB.
// This is NOT a Rankup SQL parser or an importer; actual field mapping needs its schema.
export function validateMigration(input) {
  const issues = [];
  const add = (severity, table, row, code) => issues.push({ severity, table, row, code });
  const tables = ['members', 'resumes', 'posts', 'payments', 'entitlements'];
  const data = {};
  if (input?.schemaVersion !== 1) add('blocker', 'manifest', 0, 'SCHEMA_VERSION');
  for (const table of tables) {
    if (!Array.isArray(input?.[table])) add('blocker', table, 0, 'TABLE_MISSING');
    data[table] = Array.isArray(input?.[table]) ? input[table] : [];
    if (!Number.isSafeInteger(input?.sourceCounts?.[table]) || input.sourceCounts[table] !== data[table].length) {
      add('blocker', table, 0, 'SOURCE_COUNT_MISMATCH');
    }
  }
  const indexes = {};
  for (const table of tables) {
    indexes[table] = new Map();
    data[table].forEach((record, i) => {
      if (!record || typeof record !== 'object' || Array.isArray(record)) {
        add('blocker', table, i + 1, 'INVALID_RECORD'); return;
      }
      if (typeof record.legacyId !== 'string' || !record.legacyId.trim()) add('blocker', table, i + 1, 'LEGACY_ID_MISSING');
      else if (indexes[table].has(record.legacyId)) add('blocker', table, i + 1, 'DUPLICATE_LEGACY_ID');
      else indexes[table].set(record.legacyId, record);
    });
  }
  const emails = new Set();
  data.members.forEach((r, i) => {
    if (!r || typeof r !== 'object') return;
    const row = i + 1;
    const email = String(r.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) add('blocker', 'members', row, 'EMAIL_RECOVERY_REQUIRED');
    else if (emails.has(email)) add('blocker', 'members', row, 'DUPLICATE_EMAIL_REVIEW');
    else emails.add(email);
    if (!['doctor', 'hospital'].includes(r.role)) add('blocker', 'members', row, 'ROLE_MAPPING_REQUIRED');
    if (!['active', 'suspended', 'withdrawn'].includes(r.status)) add('blocker', 'members', row, 'STATUS_MAPPING_REQUIRED');
    if (r.status !== 'active') add('review', 'members', row, 'DO_NOT_REACTIVATE');
    if (!r.name || !r.phone) add('review', 'members', row, 'PROFILE_INCOMPLETE');
    if (r.password || r.passwordHash || r.passwordSalt) add('blocker', 'members', row, 'CREDENTIALS_NOT_ALLOWED_IN_NORMALIZED_EXPORT');
    add('review', 'members', row, 'PASSWORD_COMPATIBILITY_OR_RESET_REQUIRED');
    if (r.consentEvidence !== true) add('review', 'members', row, 'CONSENT_EVIDENCE_REQUIRED');
  });
  for (const table of tables.slice(1)) data[table].forEach((r, i) => {
    if (!r || typeof r !== 'object') return;
    if (!indexes.members.has(r.memberId)) add('blocker', table, i + 1, 'ORPHAN_MEMBER');
  });
  for (const table of ['resumes', 'posts']) data[table].forEach((r, i) => {
    if (!r || typeof r !== 'object') return;
    if (!['public', 'private'].includes(r.visibility)) add('blocker', table, i + 1, 'VISIBILITY_UNKNOWN');
    if (r.visibility === 'public' && r.publicationConsent !== true) add('blocker', table, i + 1, 'PUBLICATION_CONSENT_MISSING');
    if (table === 'posts' && r.resumeId) {
      const resume = indexes.resumes.get(r.resumeId);
      if (!resume || resume.memberId !== r.memberId) add('blocker', table, i + 1, 'RESUME_OWNER_MISMATCH');
    }
  });
  data.payments.forEach((r, i) => {
    if (!r || typeof r !== 'object') return;
    if (!Number.isSafeInteger(r.amount) || r.amount < 0) add('blocker', 'payments', i + 1, 'INVALID_AMOUNT');
    if (!['paid', 'cancelled', 'refunded', 'partially_refunded', 'pending', 'failed'].includes(r.status)) add('blocker', 'payments', i + 1, 'PAYMENT_STATUS_UNKNOWN');
    if (['paid', 'partially_refunded'].includes(r.status) && !r.tid) add('review', 'payments', i + 1, 'PG_TID_MISSING');
    if (!Number.isSafeInteger(r.refundedAmount) || r.refundedAmount < 0 || r.refundedAmount > r.amount) add('blocker', 'payments', i + 1, 'REFUND_RECONCILIATION_REQUIRED');
  });
  data.entitlements.forEach((r, i) => {
    if (!r || typeof r !== 'object') return;
    const payment = indexes.payments.get(r.paymentId);
    if (!payment || payment.memberId !== r.memberId) add('blocker', 'entitlements', i + 1, 'PAYMENT_OWNER_MISMATCH');
    else if (!['paid', 'partially_refunded'].includes(payment.status)) add('blocker', 'entitlements', i + 1, 'UNPAID_ENTITLEMENT');
    if (!Number.isSafeInteger(r.remainingCredits) || r.remainingCredits < 0) add('blocker', 'entitlements', i + 1, 'INVALID_REMAINING_CREDITS');
    if (r.expiresAt !== null && (typeof r.expiresAt !== 'string' || !Number.isFinite(Date.parse(r.expiresAt)))) add('blocker', 'entitlements', i + 1, 'EXPIRY_MAPPING_REQUIRED');
  });
  const blockers = issues.filter(i => i.severity === 'blocker').length;
  return { schemaVersion: 1, status: blockers ? 'blocked' : 'review_required', importReady: false,
    counts: Object.fromEntries(tables.map(t => [t, data[t].length])), blockers,
    reviews: issues.length - blockers, issues };
}
