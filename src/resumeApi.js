// A failed or malformed read must never be treated as an empty résumé collection.
export async function loadResumes({ id = '', endpoint = '/api/resumes', signal, timeoutMs = 12000, fetchImpl = fetch } = {}) {
  const controller = new AbortController();
  let timer, cancel;
  const deadline = new Promise((_, reject) => {
    cancel = () => { controller.abort(); reject(new Error('이력서 조회가 취소되었습니다.')); };
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('이력서 조회 응답이 지연됩니다. 다시 불러오기를 눌러주세요.'));
    }, timeoutMs);
    if (signal?.aborted) cancel();
    else signal?.addEventListener('abort', cancel, { once:true });
  });
  try {
    const request = (async () => {
      const response = await fetchImpl(endpoint + (id ? '?id=' + encodeURIComponent(id) : ''), {
        credentials:'same-origin', cache:'no-store', headers:{ accept:'application/json' }, signal:controller.signal,
      }).catch(() => { throw new Error('이력서 서버에 연결하지 못했습니다. 연결 상태를 확인한 뒤 다시 불러오기를 눌러주세요.'); });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || '저장된 이력서를 불러오지 못했습니다.');
      if (!Array.isArray(result?.resumes) || result.resumes.some(item => !item || typeof item.id !== 'string' || !item.id)) {
        throw new Error('이력서 조회 응답을 확인하지 못했습니다. 다시 불러오기를 눌러주세요.');
      }
      if (id && !result.resumes.some(item => item.id === id)) throw new Error('선택한 이력서를 찾을 수 없습니다. 내 이력서 목록을 확인해주세요.');
      return result;
    })();
    return await Promise.race([request, deadline]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

export function requireResumeSave(result) {
  if (result?.saved !== true || typeof result.id !== 'string' || !result.id) {
    throw new Error('서버의 저장 완료 응답을 확인하지 못했습니다. 내 이력서 목록에서 저장 여부를 확인해주세요.');
  }
  return result;
}
