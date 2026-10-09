import test from 'node:test';
import assert from 'node:assert/strict';
import { createDbInitializer } from './dbInitialization.js';

test('concurrent and repeated initialization executes a batch once', async () => {
  const init = createDbInitializer(), db = {}; let calls = 0;
  const work = async () => { calls++; };
  await Promise.all(Array.from({length:20}, () => init(db, 'categories', work)));
  await init(db, 'categories', work);
  assert.equal(calls, 1);
});
test('failed initialization remains retryable', async () => {
  const init = createDbInitializer(), db = {}; let calls = 0;
  const work = async () => { if (++calls === 1) throw new Error('temporary'); };
  await assert.rejects(init(db, 'schema', work), /temporary/);
  await init(db, 'schema', work);
  assert.equal(calls, 2);
});
test('different DB bindings and keys never share completion state', async () => {
  const init = createDbInitializer(), a = {}, b = {}; let calls = 0;
  const work = async () => { calls++; };
  await init(a, 'schema', work); await init(b, 'schema', work); await init(a, 'seed', work);
  assert.equal(calls, 3);
});
