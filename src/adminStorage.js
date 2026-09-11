export function backupUploadedAt(object) {
  const value = object?.uploaded;
  try {
    const date = value instanceof Date ? value : typeof value === 'string' || typeof value === 'number' ? new Date(value) : null;
    if (date && Number.isFinite(date.getTime())) return date.toISOString();
  } catch {}
  const created = object?.customMetadata?.createdAt;
  if (typeof created === 'string' && Number.isFinite(Date.parse(created))) return new Date(created).toISOString();
  const match = String(object?.key || '').match(/(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/);
  return match ? `${match[1]}T${match[2]}:${match[3]}:${match[4]}.${match[5]}Z` : null;
}

export function formatAdminTime(value) {
  if (typeof value !== 'string' || !value) return '기록 없음';
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:/.test(value) ? value.replace(' ', 'T') + 'Z' : value;
  const date = new Date(normalized);
  if (!Number.isFinite(date.getTime())) return '시각 확인 필요';
  return new Intl.DateTimeFormat('ko-KR', { timeZone:'Asia/Seoul', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).format(date);
}
