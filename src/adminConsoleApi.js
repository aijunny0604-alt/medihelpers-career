// Bound the whole read, including JSON transfer, so a stalled connection has a retry path.
export async function loadConsole({ fetchImpl = fetch, timeoutMs = 20000 } = {}) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error('관리자 데이터 응답이 지연되고 있습니다. 연결을 확인한 뒤 다시 시도해주세요.');
      error.code = 'ADMIN_LOAD_TIMEOUT';
      reject(error);
      controller.abort();
    }, timeoutMs);
  });
  try {
    return await Promise.race([timeout, (async () => {
      const response = await fetchImpl('/api/admin-console', { credentials:'same-origin', signal:controller.signal });
      if (!response.ok) {
        const error = new Error([401,403].includes(response.status) ? '관리자 로그인이 필요합니다. 다시 로그인해주세요.' : '관리자 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
        error.status = response.status;
        throw error;
      }
      return response.json();
    })()]);
  } finally { clearTimeout(timer); }
}
