export function normalizeWebsiteUrl(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (/\s/.test(text) || text.includes('\\') || text.startsWith('/')) return '';
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : 'https://' + text;
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.') || url.hostname.startsWith('.') || url.hostname.endsWith('.')) return '';
    return url.href;
  } catch { return ''; }
}
