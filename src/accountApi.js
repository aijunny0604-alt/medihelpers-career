import { clearSessionToken, storeSessionToken } from './authTransport.js';

export async function authRequest(action, body = {}) {
  const formData = typeof FormData !== 'undefined' && body instanceof FormData;
  const response = await fetch(`/api/auth/${action}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: formData ? { 'x-mh-session-fallback': 'session-storage' } : { 'content-type': 'application/json', 'x-mh-session-fallback': 'session-storage' },
    body: formData ? body : JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (data.sessionToken) storeSessionToken(data.sessionToken);
  if (action === 'logout') clearSessionToken();
  if (!response.ok) throw new Error(data.error || '로그인 요청을 처리하지 못했습니다.');
  try { window.dispatchEvent(new CustomEvent('medihelpers:auth-changed', { detail:{ action, result:data } })); } catch {}
  return data;
}

export const TEST_ACCOUNTS = [
  { key: 'doctor', label: '일반회원', loginLabel: '의료인 회원', role: 'doctor' },
  { key: 'admin', label: '관리자', loginLabel: '관리자', role: 'doctor' },
  { key: 'hospital', label: '병원회원', loginLabel: '병원 회원', role: 'hospital' }
];
