const SESSION_TOKEN_KEY = 'medihelpers.session-token';

let memoryToken = '';
let installed = false;

function readSessionToken() {
  if (memoryToken) return memoryToken;
  try {
    memoryToken = window.sessionStorage.getItem(SESSION_TOKEN_KEY) || '';
  } catch {}
  return memoryToken;
}

export function storeSessionToken(token) {
  const normalized = /^[a-f0-9]{64}$/i.test(String(token || '')) ? String(token) : '';
  memoryToken = normalized;
  try {
    if (normalized) window.sessionStorage.setItem(SESSION_TOKEN_KEY, normalized);
    else window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {}
}

export function clearSessionToken() {
  storeSessionToken('');
}

export function isSameOriginApiUrl(input, origin) {
  try {
    const rawUrl = typeof input === 'string' || input instanceof URL ? String(input) : input?.url;
    const url = new URL(rawUrl, origin);
    return url.origin === origin && url.pathname.startsWith('/api/');
  } catch {
    return false;
  }
}

// 보안 쿠키를 우선 사용하되, 쿠키 저장이 차단된 브라우저에서는 로그인 응답으로
// 받은 탭 단위(sessionStorage) 토큰을 같은 출처의 API 요청에만 보냅니다.
export function installAuthenticatedFetch() {
  if (installed || typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  installed = true;
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const token = readSessionToken();
    if (!token || !isSameOriginApiUrl(input, window.location.origin)) return nativeFetch(input, init);
    const requestHeaders = typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined;
    const headers = new Headers(init.headers || requestHeaders || {});
    if (!headers.has('authorization')) headers.set('authorization', `Bearer ${token}`);
    return nativeFetch(input, { ...init, headers });
  };
}
