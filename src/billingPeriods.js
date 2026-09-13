export function addInclusiveExposureDays(startDate, days) {
  const normalizedStart = String(startDate || '').slice(0, 10);
  const match = normalizedStart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const duration = Math.max(1, Math.floor(Number(days) || 1));
  if (!match) return '';
  const end = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + duration - 1));
  return end.toISOString().slice(0, 10);
}

export function buildExposureWindow(days, epochMs = Date.now()) {
  const duration = Math.max(1, Math.floor(Number(days) || 1));
  const start = new Date(Number(epochMs) + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return { start, end:addInclusiveExposureDays(start, duration), days:duration };
}

export function normalizeExposureWindow(exposure) {
  if (!exposure || typeof exposure !== 'object') return null;
  const start = String(exposure.start || '').slice(0, 10);
  const days = Math.max(1, Math.floor(Number(exposure.days) || 1));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return exposure;
  return { ...exposure, start, end:addInclusiveExposureDays(start, days), days };
}

export function exposureRemainingLabel(endDate, status, epochMs = Date.now()) {
  if (status !== '노출 중' || !/^\d{4}-\d{2}-\d{2}$/.test(String(endDate || ''))) return '';
  const [year, month, day] = String(endDate).split('-').map(Number);
  const end = Date.UTC(year, month - 1, day);
  const now = new Date(Number(epochMs) + 9 * 60 * 60 * 1000);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const remaining = Math.floor((end - today) / 86400000) + 1;
  if (remaining <= 0) return '노출 종료';
  if (remaining === 1) return '오늘 종료';
  return `노출 ${remaining}일 남음`;
}
