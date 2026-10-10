import test from 'node:test';
import assert from 'node:assert/strict';

let sequence = 0;
const fresh = () => import(`./siteOperations.js?loading-test=${++sequence}`);
const reply = (title) => ({ ok:true, json:async () => ({ contents:[{title}] }) });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return {promise, resolve}; };

test('concurrent mounts share one request and settled results use the TTL', async (t) => {
  const response = deferred(); let calls = 0;
  t.mock.method(globalThis, 'fetch', () => { calls++; return response.promise; });
  const {loadOperations} = await fresh();
  const first = loadOperations(); const second = loadOperations();
  assert.equal(first, second);
  response.resolve(reply('current'));
  assert.equal((await first).contents[0].title, 'current');
  assert.equal((await loadOperations()).contents[0].title, 'current');
  assert.equal(calls, 1);
});

test('a stalled response body becomes a safe retryable error and recovers', async (t) => {
  let deadline; let signal;
  t.mock.method(globalThis, 'setTimeout', callback => { deadline = callback; return 1; });
  t.mock.method(globalThis, 'clearTimeout', () => {});
  const stalled = deferred(); let calls = 0;
  t.mock.method(globalThis, 'fetch', (_url, options) => {
    signal = options.signal; calls++;
    return calls === 1 ? {ok:true, json:() => stalled.promise} : reply('recovered');
  });
  const {loadOperations, invalidateSiteOperations} = await fresh();
  const loading = loadOperations();
  await Promise.resolve(); deadline();
  const failure = await loading;
  assert.equal(signal.aborted, true);
  assert.equal(failure.errorCode, 'UNAVAILABLE');
  assert.match(failure.errorMessage, /다시 시도/);
  await loadOperations(); assert.equal(calls, 1);
  invalidateSiteOperations();
  assert.equal((await loadOperations()).contents[0].title, 'recovered');
  assert.equal(calls, 2);
  stalled.resolve({contents:[{title:'obsolete'}]});
  assert.equal((await loadOperations()).contents[0].title, 'recovered');
});

test('invalidation prevents an older response from overwriting the new result', async (t) => {
  const old = deferred(); let calls = 0;
  t.mock.method(globalThis, 'fetch', () => ++calls === 1 ? old.promise : reply('new'));
  const {loadOperations, invalidateSiteOperations} = await fresh();
  const original = loadOperations(); await Promise.resolve();
  invalidateSiteOperations();
  const current = await loadOperations();
  old.resolve(reply('old'));
  assert.equal((await original).contents[0].title, 'new');
  assert.equal(current.contents[0].title, 'new');
  assert.equal(calls, 2);
});
