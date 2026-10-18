import test from 'node:test';
import assert from 'node:assert/strict';
import {loadConsole} from './adminConsoleApi.js';
test('admin console loads its real response with same-origin credentials', async()=>{
  const data={metrics:{accounts:3}};
  assert.deepEqual(await loadConsole({fetchImpl:async(url,options)=>{assert.equal(url,'/api/admin-console');assert.equal(options.credentials,'same-origin');assert.ok(options.signal);return Response.json(data);}}),data);
});
test('admin console distinguishes expired login from server failure', async()=>{
  for(const status of [401,403,503])await assert.rejects(loadConsole({fetchImpl:async()=>new Response('',{status})}),error=>error.status===status&&error.message.includes(status===503?'불러오지':'로그인'));
});
test('admin console stalled fetch times out and aborts', async()=>{
  let signal;
  await assert.rejects(loadConsole({timeoutMs:5,fetchImpl:async(_,options)=>{signal=options.signal;return new Promise(()=>{});}}),{code:'ADMIN_LOAD_TIMEOUT'});
  assert.equal(signal.aborted,true);
});
test('admin console stalled response body also times out', async()=>{
  await assert.rejects(loadConsole({timeoutMs:5,fetchImpl:async()=>({ok:true,json:()=>new Promise(()=>{})})}),{code:'ADMIN_LOAD_TIMEOUT'});
});
