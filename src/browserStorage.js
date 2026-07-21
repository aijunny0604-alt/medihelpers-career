const memoryStorage = new Map();

function getStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function readStoredValue(key, fallback) {
  const storage = getStorage();
  let raw;

  try {
    raw = storage?.getItem(key) ?? memoryStorage.get(key);
  } catch {
    raw = memoryStorage.get(key);
  }

  if (raw == null) return fallback;

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function readStoredArray(key) {
  const value = readStoredValue(key, []);
  return Array.isArray(value) ? value : [];
}

export function writeStoredValue(key, value) {
  const serialized = JSON.stringify(value);
  memoryStorage.set(key, serialized);

  try {
    getStorage()?.setItem(key, serialized);
  } catch {
    // Keep the current session usable when storage is unavailable or full.
  }

  return value;
}

export function appendStoredRecord(key, record, limit) {
  const records = [...readStoredArray(key), record];
  const next = limit ? records.slice(-limit) : records;
  writeStoredValue(key, next);
  return next;
}

export function readStoredString(key, fallback = '') {
  const storage = getStorage();

  try {
    return storage?.getItem(key) ?? memoryStorage.get(key) ?? fallback;
  } catch {
    return memoryStorage.get(key) ?? fallback;
  }
}

export function writeStoredString(key, value) {
  const serialized = String(value);
  memoryStorage.set(key, serialized);

  try {
    getStorage()?.setItem(key, serialized);
  } catch {
    // Keep the current session usable when storage is unavailable or full.
  }

  return serialized;
}

// 전역 알림(토스트) 발행. 컴포넌트 트리와 무관하게 어디서든 사용자에게 알릴 수 있어야 해서
// 커스텀 이벤트로 띄운다(App의 Toaster가 수신). 프롭 전달·컨텍스트 배선이 필요 없다.
export function notify(message, tone = 'error') {
  if (!message || typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('medihelpers:notify', { detail: { message, tone } }));
  } catch {
    // CustomEvent를 못 쓰는 환경에서는 알림을 생략한다(기능 자체는 계속 동작).
  }
}

// 관심공고 토글을 서버에 반영(로그인 시).
// 화면은 localStorage로 먼저 동작하지만, 서버 반영이 실패하면 다른 기기에서 관심공고가 사라진다.
// 예전에는 .catch(() => {})로 완전히 삼켜서 사용자가 이 사실을 알 방법이 없었다.
// → 결과를 돌려주어 호출부가 필요하면 안내할 수 있게 한다(비로그인 401은 정상 상황이라 조용히 넘어간다).
export async function syncSavedToServer(jobId, kind = 'job') {
  try {
    const response = await fetch('/api/saved-jobs', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jobId, kind }),
    });
    if (response.ok) return { ok: true };
    // 로그인하지 않은 사용자는 서버 저장 대상이 아니다(로컬 저장만으로 정상 동작).
    if (response.status === 401) return { ok: true, localOnly: true };
    const message = '관심공고를 서버에 저장하지 못했습니다. 다른 기기에서는 보이지 않을 수 있습니다.';
    notify(message);
    return { ok: false, message };
  } catch {
    const message = '네트워크 연결이 불안정해 이 기기에만 저장했습니다.';
    notify(message);
    return { ok: false, message };
  }
}
