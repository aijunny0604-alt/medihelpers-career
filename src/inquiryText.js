export function isUnreadableInquiryText(value) {
  const text = String(value || '').trim();
  if (!text) return true;

  const compact = text.replace(/\s/g, '');
  const questionCount = (text.match(/[?？]/g) || []).length;

  // Old encoding failures and placeholder-only strings are not usable messages.
  if (text.includes('�')) return true;
  if (/^[?？□○◯●ㆍ·._\-]+$/u.test(compact)) return true;
  if (questionCount >= 3 && questionCount / Math.max(1, compact.length) >= 0.18) return true;

  return false;
}

export function cleanInquiryText(value, fallback = '') {
  const text = String(value || '').trim();
  return isUnreadableInquiryText(text) ? fallback : text;
}
