// D1 timestamps without an offset are UTC; date-only business dates stay unchanged.
export function koreanDate(value) {
  if (typeof value !== 'string' || !value) return '기록 없음';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const normalized=/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(value)?value.replace(' ','T')+'Z':value;
  const ms=Date.parse(normalized);
  return Number.isFinite(ms)?new Date(ms+9*3600000).toISOString().slice(0,10):'시각 확인 필요';
}

// datetime-local has no timezone. Interpret the explicitly labelled Korean wall clock.
export function koreanInputToIso(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) throw Error('INVALID_KOREAN_TIME');
  const full=value.length===16?value+':00':value;
  const ms=Date.parse(full+'+09:00');
  if(!Number.isFinite(ms)||new Date(ms+9*3600000).toISOString().slice(0,19)!==full)throw Error('INVALID_KOREAN_TIME');
  return new Date(ms).toISOString();
}
