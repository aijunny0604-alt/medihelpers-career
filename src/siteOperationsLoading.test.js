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
  assert.equal(failure.errorCode, 'REQUEST_TIMEOUT');
  assert.match(failure.errorMessage, /다시 불러오기/);
  await loadOperations(); assert.equal(calls, 1);
  invalidateSiteOperations();
  assert.equal((await loadOperations()).contents[0].title, 'recovered');
  assert.equal(calls, 2);
  stalled.resolve({contents:[{title:'obsolete'}]});
  assert.equal((await loadOperations()).contents[0].title, 'recovered');
});

test('network and unreadable responses have distinct safe guidance and can retry', async (t) => {
  let calls=0;
  t.mock.method(globalThis,'fetch',(_url,options)=>{
    assert.equal(options.cache,'no-store');
    calls++;
    if(calls===1) return Promise.reject(new TypeError('private transport details'));
    if(calls===2) return {ok:true,json:async()=>{throw new SyntaxError('private response body');}};
    if(calls===3) return {ok:true,json:async()=>({})};
    return reply('restored');
  });
  const {loadOperations}=await fresh();
  assert.equal((await loadOperations()).errorCode,'NETWORK_ERROR');
  for(let i=0;i<2;i++){
    const failure=await loadOperations(true);
    assert.equal(failure.errorCode,'INVALID_RESPONSE');
    assert.doesNotMatch(failure.errorMessage,/private/);
  }
  const result=await loadOperations(true);
  assert.equal(result.contents[0].title,'restored');
  assert.equal(result.error,undefined);
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

test('retry immediately clears the displayed error and publishes its progress to every screen', async (t) => {
  const next=deferred();let calls=0;
  t.mock.method(globalThis,'fetch',()=>++calls===1?Promise.reject(new Error('offline')):next.promise);
  const api=await fresh();
  const seen=[];const stop=api.subscribeSiteOperations(()=>seen.push(api.getSiteOperationsSnapshot()));
  await api.loadOperations();
  assert.equal(seen.at(-1).operations.errorCode,'NETWORK_ERROR');
  const retry=api.retrySiteOperations();
  assert.equal(seen.at(-1).loading,true);
  assert.equal(seen.at(-1).retrying,true);
  assert.equal(seen.at(-1).ready,false);
  assert.equal(seen.at(-1).operations.error,undefined);
  assert.equal(api.retrySiteOperations(),retry);
  next.resolve(reply('recovered'));
  await retry;
  assert.equal(calls,2);
  assert.equal(seen.at(-1).loading,false);
  assert.equal(seen.at(-1).operations.contents[0].title,'recovered');
  stop();const length=seen.length;await api.loadOperations(true);assert.equal(seen.length,length);
});

test('invalidation aborts a hung request and all waiters finish with the replacement', async (t) => {
  let calls=0;let oldSignal;
  t.mock.method(globalThis,'fetch',(_url,{signal})=>{
    if(++calls===1){oldSignal=signal;return new Promise(()=>{});}
    return reply('replacement');
  });
  const api=await fresh();
  const first=api.loadOperations();await Promise.resolve();
  await api.invalidateSiteOperations();
  assert.equal(oldSignal.aborted,true);
  assert.equal((await first).contents[0].title,'replacement');
  assert.equal(api.getSiteOperationsSnapshot().loading,false);
});

test('auth change erases privileged cached data synchronously even if the next request fails', async (t) => {
  let calls=0;const next=deferred();
  t.mock.method(globalThis,'fetch',()=>++calls===1?reply('private previous account'):next.promise);
  const api=await fresh();await api.loadOperations();
  const reset=api.resetSiteOperationsForAuth();
  assert.deepEqual(api.getSiteOperationsSnapshot().operations.contents,[]);
  assert.equal(api.getSiteOperationsSnapshot().ready,false);
  next.resolve({ok:false,json:async()=>({code:'UNAVAILABLE'})});await reset;
  assert.deepEqual(api.getSiteOperationsSnapshot().operations.contents,[]);
  assert.equal(api.getSiteOperationsSnapshot().operations.error,true);
});

test('all consumers observe a mutation refresh without requiring route or focus events', async (t) => {
  let calls=0;
  t.mock.method(globalThis,'fetch',()=>reply('revision '+ ++calls));
  const api=await fresh();await api.loadOperations();
  const seen=[];const stop=api.subscribeSiteOperations(()=>seen.push(api.getSiteOperationsSnapshot()));
  await api.invalidateSiteOperations();
  assert.equal(seen[0].loading,true);
  assert.equal(seen.at(-1).operations.contents[0].title,'revision 2');
  assert.equal(seen.at(-1).ready,true);stop();
});

test('a delayed previous-account response cannot reappear after auth reset', async (t) => {
  const old=deferred();let calls=0;
  t.mock.method(globalThis,'fetch',()=>++calls===1?old.promise:reply('current account'));
  const api=await fresh();const previous=api.loadOperations();await Promise.resolve();
  await api.resetSiteOperationsForAuth();old.resolve(reply('previous private data'));
  await previous;
  assert.equal(api.getSiteOperationsSnapshot().operations.contents[0].title,'current account');
});

test('a second timed out attempt exits the busy state and permits a later successful retry', async (t) => {
  let deadline;let calls=0;
  t.mock.method(globalThis,'setTimeout',callback=>{deadline=callback;return 1;});
  t.mock.method(globalThis,'clearTimeout',()=>{});
  t.mock.method(globalThis,'fetch',()=>++calls<3?new Promise(()=>{}):reply('eventually recovered'));
  const api=await fresh();
  for(let i=0;i<2;i++){
    const request=api.retrySiteOperations();await Promise.resolve();deadline();await request;
    const state=api.getSiteOperationsSnapshot();
    assert.equal(state.loading,false);assert.equal(state.operations.errorCode,'REQUEST_TIMEOUT');
  }
  assert.equal((await api.retrySiteOperations()).contents[0].title,'eventually recovered');
  assert.equal(calls,3);
});

for (const invalid of [{contents:[null]}, {contents:[[]]}, {contents:['bad']}, {contents:[{payload:[]}]}, {contents:[{title:{text:'bad'}}]}, {contents:[],settings:[]}, {contents:[],features:'bad'}]) {
  test('손상된 공고 구조는 화면 예외 대신 조회 오류와 재시도로 처리한다: '+JSON.stringify(invalid), async(t)=>{
    let calls=0;
    t.mock.method(globalThis,'fetch',()=>({ok:true,json:async()=>++calls===1?invalid:{contents:[{title:'recovered'}]}}));
    const api=await fresh();
    const failed=await api.loadOperations();
    assert.equal(failed.errorCode,'INVALID_RESPONSE');
    assert.deepEqual(failed.contents,[]);
    assert.equal((await api.retrySiteOperations()).contents[0].title,'recovered');
  });
}

test('정상 목록 다음의 손상 응답은 기존 데이터를 지우지 않는다',async(t)=>{
  let calls=0;
  t.mock.method(globalThis,'fetch',()=>({ok:true,json:async()=>({contents:++calls===1?[{title:'retained'}]:[null]})}));
  const api=await fresh();await api.loadOperations();
  const failure=await api.invalidateSiteOperations();
  assert.equal(failure.errorCode,'INVALID_RESPONSE');
  assert.equal(failure.contents[0].title,'retained');
});
