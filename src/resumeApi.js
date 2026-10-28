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

export function requireResumeSave(result, expectedId = '') {
  if (result?.saved !== true || typeof result.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(result.id) || (expectedId && result.id !== expectedId)) {
    throw new Error('서버의 저장 완료 응답을 확인하지 못했습니다. 내 이력서 목록에서 저장 여부를 확인해주세요.');
  }
  return result;
}

// 저장 응답을 잃었을 때 자동 재전송하지 않는다. 이미 처리됐을 수 있으므로 목록 확인을 안내한다.
export async function requestResumeWrite(endpoint, init, { signal, timeoutMs = 30000, fetchImpl = fetch } = {}) {
  const controller = new AbortController();
  const unknown = () => new Error('이력서·사진 저장 결과를 확인하지 못했습니다. 입력 내용은 유지됩니다. 다시 저장하기 전에 내 이력서 목록에서 반영 여부를 확인해주세요.');
  let timer, cancel;
  const deadline = new Promise((_, reject) => {
    cancel = () => { controller.abort(); reject(Object.assign(new Error('이력서 저장 요청이 취소되었습니다.'), { name:'AbortError' })); };
    timer = setTimeout(() => { controller.abort(); reject(unknown()); }, timeoutMs);
    if (signal?.aborted) cancel();
    else signal?.addEventListener('abort', cancel, { once:true });
  });
  try {
    const request = (async () => {
      if (controller.signal.aborted) throw Object.assign(new Error('이력서 저장 요청이 취소되었습니다.'), { name:'AbortError' });
      let response, result;
      try {
        response = await fetchImpl(endpoint, { ...init, method:'POST', credentials:'same-origin', signal:controller.signal });
        result = await response.json();
      } catch {
        throw Object.assign(unknown(), { status:response?.status });
      }
      if (!response.ok) throw Object.assign(new Error(typeof result?.error === 'string' ? result.error : '이력서를 저장하지 못했습니다. 로그인 상태와 입력 내용을 확인해주세요.'), { status:response.status });
      if (!result || typeof result !== 'object' || Array.isArray(result)) throw unknown();
      return result;
    })();
    return await Promise.race([request, deadline]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

export async function saveResume(body, { endpoint = '/api/resumes', ...options } = {}) {
  const result = await requestResumeWrite(endpoint, { headers:{ 'content-type':'application/json' }, body:JSON.stringify(body) }, options);
  return requireResumeSave(result, body.resumeId || '');
}
