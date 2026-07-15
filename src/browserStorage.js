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
