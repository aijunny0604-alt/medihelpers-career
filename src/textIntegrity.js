const PLACEHOLDER_ONLY = /^[?？□○◯●ㆍ·._\-]+$/u;
const MOJIBAKE_MARKERS = /[ÃÂâðìëêí]/g;

export function isUnreadableText(value) {
  const text = String(value ?? '').trim();
  if (!text) return false;
  if (text.includes('\uFFFD')) return true;
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(text)) return true;

  const compact = text.replace(/\s/g, '');
  if (compact.length >= 3 && PLACEHOLDER_ONLY.test(compact)) return true;

  const markers = text.match(MOJIBAKE_MARKERS) || [];
  return markers.length >= 2 && !/[가-힣]/u.test(text);
}

export function cleanDisplayText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return isUnreadableText(text) ? fallback : text;
}

export function sanitizeDisplayData(value) {
  if (typeof value === 'string') return cleanDisplayText(value);
  if (Array.isArray(value)) return value.map(sanitizeDisplayData);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeDisplayData(item)]));
}
