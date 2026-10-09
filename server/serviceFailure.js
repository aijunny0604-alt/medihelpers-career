// Classify only the provider's explicit daily D1 limit; never expose SQL/errors.
export function serviceFailure(error, now = Date.now()) {
  const seen = new Set();
  let current = error;
  for (let depth = 0; current && depth < 5 && !seen.has(current); depth++) {
    seen.add(current);
    const message = String(current.message || '');
    if (/D1/i.test(message) && /(?:exceeded|exceed).*(?:daily|day).*(?:read|write).*limit/i.test(message)) {
      const date = new Date(now);
      const reset = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
      return {
        status: 503,
        body: { error:'현재 서비스 이용이 일시 중단되었습니다. 한국시간 오전 9시 이후 다시 시도해 주세요. 결제 중이었다면 다시 결제하지 말고 결제 내역을 먼저 확인해 주세요.', code:'SERVICE_DAILY_LIMIT', retryAt:new Date(reset).toISOString() },
        headers: { 'Retry-After':String(Math.max(1, Math.ceil((reset - now) / 1000))), 'Cache-Control':'no-store' },
      };
    }
    current = current.cause;
  }
  return null;
}
