// Environment-only operational controls. Never trust cookies, query parameters,
// request headers or an admin role to bypass a migration freeze.
export function migrationControl(env = {}) {
  const raw = String(env.MIGRATION_MODE ?? 'open').trim().toLowerCase();
  const mode = ['open', 'drain', 'frozen'].includes(raw) ? raw : 'frozen';
  const checkoutEnabled = String(env.CHECKOUT_ENABLED ?? 'true').trim().toLowerCase() === 'true';
  return { mode, checkoutEnabled: mode === 'open' && checkoutEnabled };
}

export function migrationGate(request, env = {}) {
  const control = migrationControl(env);
  const pathname = new URL(request.url).pathname;
  const headers = { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
  const asJson = (body, status) => new Response(JSON.stringify(body), {
    status, headers: { ...headers, 'content-type': 'application/json; charset=utf-8', ...(status === 503 ? { 'retry-after': '300' } : {}) }
  });
  if (env.STAGING_READ_ONLY === 'true' && !['GET','HEAD'].includes(request.method)) {
    return asJson({ code:'STAGING_READ_ONLY', error:'무료 테스트 환경은 화면 확인 전용입니다. 회원가입·게시·결제는 아직 지원하지 않습니다.' },503);
  }
  if (pathname === '/api/service-status') {
    if (!['GET', 'HEAD'].includes(request.method)) return asJson({ error: '지원하지 않는 요청입니다.' }, 405);
    return new Response(request.method === 'HEAD' ? null : JSON.stringify(control), {
      headers: { ...headers, 'content-type': 'application/json; charset=utf-8' }
    });
  }
  if (control.mode === 'open') {
    if (!control.checkoutEnabled && pathname === '/api/payment-orders' && request.method === 'POST') {
      return asJson({ code: 'CHECKOUT_PAUSED', error: '결제 점검 중으로 새 구매를 잠시 중단했습니다. 진행 중인 결제는 결과 확인 후 안내됩니다.' }, 503);
    }
    return null;
  }
  // Drain preserves the EXISTING handler and all its checks; this is not a new
  // PG integration or a promise of successful real payment processing.
  if (control.mode === 'drain' && pathname === '/api/payment-approve' && request.method === 'POST') return null;
  if (pathname === '/api' || pathname.startsWith('/api/') || !['GET', 'HEAD'].includes(request.method)) {
    return asJson({ code: 'MIGRATION_MAINTENANCE', error: '안전한 서비스 이전을 위해 잠시 점검 중입니다. 작성 내용은 보관해 두시고, 결제 결과가 불명확하면 반복 결제하지 말아 주세요.' }, 503);
  }
  // Read handlers can expire records, consume credits, write audits or purge
  // files. Block the API namespace in full, not only POST/PATCH/DELETE.
  if (!pathname.includes('.') || request.headers.get('accept')?.includes('text/html')) {
    const page = '<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>서비스 점검 안내 | 메디헬퍼스</title><style>body{margin:0;background:#f4f7fc;color:#10213f;font:18px/1.7 system-ui,sans-serif;display:grid;min-height:100vh;place-items:center}main{max-width:620px;margin:24px;padding:40px;background:white;border:1px solid #dae4f3;border-radius:20px}h1{font-size:30px;line-height:1.4}strong{color:#1263e8}p{word-break:keep-all}</style><main><strong>메디헬퍼스</strong><h1>안전한 서비스 이전을 위해<br>잠시 점검하고 있습니다.</h1><p>점검 중에는 로그인, 게시글 변경 및 새 결제가 잠시 중단됩니다. 잠시 후 다시 방문해 주세요.</p><p>이미 결제하셨다면 결과가 확인될 때까지 반복 결제하지 말아 주세요. 기존 이용 내역은 확인 후 안내하겠습니다.</p></main></html>';
    return new Response(request.method === 'HEAD' ? null : page, { status: 503, headers: {
      ...headers, 'content-type': 'text/html; charset=utf-8', 'retry-after': '300',
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'"
    } });
  }
  return null;
}
