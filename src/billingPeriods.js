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
