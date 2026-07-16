import assert from 'node:assert/strict';
import test from 'node:test';
import {
  appendStoredRecord,
  readStoredArray,
  readStoredValue,
  writeStoredValue
} from './browserStorage.js';

function useStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  return values;
}

test('returns a safe fallback for malformed or non-array data', () => {
  useStorage({ malformed: '{', object: '{"id":1}' });

  assert.deepEqual(readStoredValue('malformed', { safe: true }), { safe: true });
  assert.deepEqual(readStoredArray('object'), []);
});

test('limits appended records to the newest entries', () => {
  const values = useStorage({ events: '[{"id":1},{"id":2}]' });

  assert.deepEqual(appendStoredRecord('events', { id: 3 }, 2), [{ id: 2 }, { id: 3 }]);
  assert.equal(values.get('events'), '[{"id":2},{"id":3}]');
});

test('falls back to memory when browser storage is blocked', () => {
  globalThis.localStorage = {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); }
  };

  writeStoredValue('blocked-value', ['kept']);

  assert.deepEqual(readStoredArray('blocked-value'), ['kept']);
});
