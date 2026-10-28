import { clearSessionToken, storeSessionToken } from './authTransport.js';
import { DEMO_MODE } from './demoMode.js';

export function publishAuthChange(action, data) {
  try { window.dispatchEvent(new CustomEvent('medihelpers:auth-changed', { detail:{ action, result:data } })); } catch {}
}

function requireRegistrationResult(data, body, formData) {
  let submitted;
  try { submitted = formData ? JSON.parse(body.get('payload')) : body; } catch {}
  const email = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (data.error || !['doctor', 'hospital'].includes(data.account?.role) || data.account.role !== submitted?.role ||
      !email(data.identity?.email) || email(data.identity.email) !== email(submitted?.email) ||
      (data.identity.loginId != null && submitted?.loginId != null && data.identity.loginId !== String(submitted.loginId).trim())) {
    throw new Error('가입 완료 응답을 확인하지 못했습니다. 가입이 완료되었을 수 있으니 입력한 아이디로 로그인해 확인해주세요.');
  }
}

export async function authRequest(action, body = {}, { timeoutMs = 30000, fetchImpl = fetch, signal, notifyAuthChange = true } = {}) {
  const formData = typeof FormData !== 'undefined' && body instanceof FormData;
  const controller = new AbortController();
  const cancelled = () => Object.assign(new Error(action === 'register'
    ? '가입 요청 대기를 중단했습니다. 가입이 완료되었을 수 있으니 입력한 아이디로 로그인해 확인해주세요.'
    : '인증 요청이 취소되었습니다.'), { name:'AbortError' });
  let timer, cancel;
  const deadline = new Promise((_, reject) => {
    cancel = () => { controller.abort(); reject(cancelled()); };
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(action === 'register'
        ? '가입 응답이 지연됩니다. 가입이 완료되었을 수 있으니 입력한 아이디로 로그인해 확인해주세요.'
        : '서버 응답이 지연됩니다. 잠시 후 다시 시도해주세요.'));
    }, timeoutMs);
    if (signal?.aborted) cancel();
    else signal?.addEventListener('abort', cancel, { once:true });
  });
  const request = (async () => {
    if (controller.signal.aborted) throw cancelled();
    const response = await fetchImpl(`/api/auth/${action}`, {
      method: 'POST',
      credentials: 'same-origin',
      signal:controller.signal,
      headers: formData ? { 'x-mh-session-fallback': 'session-storage' } : { 'content-type': 'application/json', 'x-mh-session-fallback': 'session-storage' },
      body: formData ? body : JSON.stringify(body)
    }).catch(() => { throw new Error('서버에 연결하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해주세요.'); });
    const data = await response.json().catch(() => null);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('서버 응답을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.');
    if (!response.ok) throw new Error(data.error || '로그인 요청을 처리하지 못했습니다.');
    if (action === 'logout' && data.signedOut !== true) throw new Error('로그아웃 완료 응답을 확인하지 못했습니다. 다시 시도해주세요.');
    if (action !== 'logout' && data.signedIn !== true) throw new Error('로그인 완료 응답을 확인하지 못했습니다. 다시 시도해주세요.');
    if (action === 'register') requireRegistrationResult(data, body, formData);
    return data;
  })();
  let data;
  try { data = await Promise.race([request, deadline]); }
  finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
  // 늦게 도착한 응답이 만료된 요청의 세션을 다시 저장하지 않도록 race 뒤에서 처리한다.
  if (signal?.aborted) throw cancelled();
  if (data.sessionToken) storeSessionToken(data.sessionToken);
  if (action === 'logout') clearSessionToken();
  if (notifyAuthChange) publishAuthChange(action, data);
  return data;
}

export const TEST_ACCOUNTS = !DEMO_MODE ? [] : [
  { key: 'doctor', label: '일반회원', loginLabel: '의료인 회원', role: 'doctor' },
  { key: 'admin', label: '관리자', loginLabel: '관리자', role: 'doctor' },
  { key: 'hospital', label: '병원회원', loginLabel: '병원 회원', role: 'hospital' }
];
