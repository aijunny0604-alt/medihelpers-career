import { withBase } from './basePath.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const failure = (code, message) => Object.assign(new Error(message), { code });
const aborted = () => new DOMException('회원정보 조회를 취소했습니다.', 'AbortError');

export function validAccountLookup(value) {
  if (!object(value) || typeof value.signedIn !== 'boolean') return false;
  for (const key of ['isAdmin', 'signupEnabled', 'testAccountsEnabled', 'welcomeEmailAvailable', 'adminSignupEmailAvailable']) {
    if (value[key] !== undefined && typeof value[key] !== 'boolean') return false;
  }
  for (const key of ['account', 'identity', 'profile', 'registrationProfile', 'hospitalProfile']) {
    if (value[key] != null && !object(value[key])) return false;
  }
  if (value.account != null && !['doctor', 'hospital'].includes(value.account.role)) return false;
  if (!value.signedIn) return value.account == null && value.isAdmin !== true;
  // 인증은 되었지만 아직 회원 원장이 없는 기존 계정도 서버 계약상 유효하다.
  return object(value.identity) && ['email', 'loginId', 'accountId'].some(key =>
    typeof value.identity[key] === 'string' && value.identity[key].trim().length > 0);
}

export async function lookupAccount({ signal, timeoutMs = 12000, fetchImpl = fetch } = {}) {
  if (signal?.aborted) throw aborted();
  const controller = new AbortController();
  let timer, cancel;
  const deadline = new Promise((_, reject) => {
    cancel = () => { reject(aborted()); controller.abort(); };
    signal?.addEventListener('abort', cancel, { once:true });
    timer = setTimeout(() => {
      reject(failure('ACCOUNT_LOOKUP_TIMEOUT', '로그인 상태 확인이 지연됩니다. 다시 확인을 눌러주세요.'));
      controller.abort();
    }, timeoutMs);
  });
  const request = (async () => {
    let response;
    try {
      response = await fetchImpl(withBase('/api/account'), {
        credentials:'same-origin', cache:'no-store', headers:{ accept:'application/json' }, signal:controller.signal,
      });
    } catch {
      throw failure('ACCOUNT_LOOKUP_NETWORK', '로그인 상태를 확인하지 못했습니다. 연결 상태를 확인한 뒤 다시 확인해주세요.');
    }
    if (!response.ok) throw failure('ACCOUNT_LOOKUP_UNAVAILABLE', '로그인 상태를 확인하지 못했습니다. 잠시 후 다시 확인해주세요.');
    let result;
    try { result = await response.json(); }
    catch { throw failure('ACCOUNT_LOOKUP_INVALID', '회원정보 응답을 확인하지 못했습니다. 다시 확인해주세요.'); }
    if (!validAccountLookup(result)) throw failure('ACCOUNT_LOOKUP_INVALID', '회원정보 응답을 확인하지 못했습니다. 다시 확인해주세요.');
    return result;
  })();
  try { return await Promise.race([request, deadline]); }
  finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
}
