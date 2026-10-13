// Transition candidate only: not imported by the deployed Worker.
// Requires a Workers Route over proxied DNS pointing to the legacy origin.
export async function legacyPaymentBridge(request, env, originFetch = fetch) {
  if (env.LEGACY_PAYMENT_BRIDGE_ENABLED !== 'true') return null;
  const url = new URL(request.url);
  const prefix = '/rankup_module/rankup_payment/inistdpay/';
  const allowed = [prefix+'INIStdPayReturn.php', prefix+'close.php', prefix+'popup.php'];
  if (url.protocol !== 'https:' || !['www.medihelpers.co.kr','medihelpers.co.kr'].includes(url.host)
      || !allowed.includes(url.pathname)) return null;
  const safeHeaders = {'cache-control':'no-store','content-type':'text/plain; charset=utf-8','x-content-type-options':'nosniff'};
  if (!['GET','HEAD','POST'].includes(request.method)) return new Response('Method Not Allowed',{status:405,headers:{...safeHeaders,allow:'GET, HEAD, POST'}});
  const headers = new Headers(request.headers);
  // The new application's session and bearer credentials must not reach PHP.
  headers.delete('authorization'); headers.delete('cookie');
  const phpSession = (request.headers.get('cookie') || '').split(';').map(x=>x.trim()).filter(x=>/^PHPSESSID=[a-zA-Z0-9,-]+$/.test(x));
  if (phpSession.length === 1) headers.set('cookie',phpSession[0]);
  try {
    // Manual redirect prevents forwarding a payment body to a different host.
    // A Route fetch goes to the configured origin; a Custom Domain does not.
    const response = await originFetch(new Request(request,{headers,redirect:'manual'}));
    const output = new Headers(response.headers);
    output.set('cache-control','no-store');output.set('referrer-policy','no-referrer');
    output.delete('set-cookie');
    for (const cookie of response.headers.getSetCookie()) {
      if (/^PHPSESSID=[a-zA-Z0-9,-]+(?:;|$)/.test(cookie)) output.append('set-cookie',cookie);
    }
    return new Response(request.method==='HEAD'?null:response.body,{status:response.status,headers:output});
  } catch {
    // Never retry an approval request: the origin may already have processed it.
    return new Response('결제 결과를 확인하지 못했습니다. 재결제하지 말고 고객센터(051-342-5463)에 확인해주세요.',{status:502,headers:safeHeaders});
  }
}
