import { withBase } from './basePath.js';

const object = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const aborted = () => new DOMException('조회를 취소했습니다.', 'AbortError');

async function read(path, validate, message, { signal, timeoutMs = 12000, fetchImpl = fetch } = {}) {
  if (signal?.aborted) throw aborted();
  const controller = new AbortController();
  let timer, cancel;
  const deadline = new Promise((_, reject) => {
    cancel = () => { reject(aborted()); controller.abort(); };
    signal?.addEventListener('abort', cancel, { once:true });
    timer = setTimeout(() => {
      reject(Object.assign(new Error(message), { code:'MEMBER_READ_TIMEOUT' }));
      controller.abort();
    }, timeoutMs);
  });
  const request = (async () => {
    try {
      const response = await fetchImpl(withBase(path), {
        method:'GET', credentials:'same-origin', cache:'no-store', headers:{ accept:'application/json' }, signal:controller.signal,
      });
      if (!response.ok) throw new Error(message);
      const data = await response.json();
      if (!validate(data)) throw new Error(message);
      return data;
    } catch { throw new Error(message); }
  })();
  try { return await Promise.race([request, deadline]); }
  finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
}

function validMemberData(data) {
  if (!object(data) || data.signedIn !== true) return false;
  for (const key of ['orders', 'refunds']) if (!Array.isArray(data[key])) return false;
  for (const key of ['orders', 'refunds', 'consultations', 'alerts', 'activity', 'migratedAds', 'jobSeekerPosts', 'recommendedCandidates', 'unlockedTalents']) {
    if (data[key] !== undefined && (!Array.isArray(data[key]) || !data[key].every(object))) return false;
  }
  for (const key of ['account', 'identity', 'profile', 'notifications', 'resume', 'talentCredits']) {
    if (data[key] != null && !object(data[key])) return false;
  }
  return true;
}

export function loadMemberCenter(options) {
  return read('/api/member-center', data => validMemberData(data) && ['doctor', 'hospital'].includes(data.account?.role),
    '회원 정보를 불러오지 못했습니다. 잠시 후 다시 연결해주세요.', options);
}

export function loadMemberPaymentDetails(options) {
  return read('/api/member-center', validMemberData,
    '최신 결제 내역을 확인하지 못했습니다. 기존 내역은 유지됩니다. 잠시 후 처리 결과를 새로고침해주세요.', options);
}

export function loadTalentContactPreview(talentId, options) {
  return read(`/api/talent-detail/${encodeURIComponent(talentId)}?preview=1`,
    data => object(data) && data.available === true && ['private', 'ticket'].includes(data.contactVisibility) && typeof data.isDemo === 'boolean',
    '연락처 공개 설정을 확인하지 못했습니다. 다시 확인해주세요.', options);
}
