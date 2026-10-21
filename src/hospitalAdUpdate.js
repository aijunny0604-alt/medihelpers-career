import { withBase } from './basePath.js';

export async function saveHospitalAd(contentRecordId, content, { fetcher = fetch, timeoutMs = 30000 } = {}) {
  const controller = new AbortController();
  let timer;
  const unknown = () => new Error('저장 결과를 확인하지 못했습니다. 입력 내용은 유지됩니다. 내 공고에서 반영 여부를 확인한 뒤 다시 시도해주세요.');
  const request = (async () => {
    let response, result;
    try {
      response = await fetcher(withBase('/api/member-center'), {
        method:'POST', credentials:'same-origin', signal:controller.signal,
        headers:{ 'content-type':'application/json' },
        body:JSON.stringify({ action:'owned_ad_update', contentRecordId, content }),
      });
      result = await response.json();
    } catch { throw unknown(); }
    if (!response.ok) throw new Error(result?.error || '공고를 수정하지 못했습니다. 입력 내용을 확인해주세요.');
    if (result?.updated !== true || String(result?.content?.id || '') !== String(contentRecordId)) throw unknown();
    return result;
  })();
  try {
    return await Promise.race([request, new Promise((_, reject) => {
      timer = setTimeout(() => { reject(unknown()); controller.abort(); }, timeoutMs);
    })]);
  } finally { clearTimeout(timer); }
}
