import test from 'node:test';
import assert from 'node:assert/strict';
import {loadResumes, requireResumeSave} from './resumeApi.js';

test('resume read requests exact owned ID with credentials and no cache', async () => {
  const result={resumes:[{id:'RES /?'}]};
  assert.deepEqual(await loadResumes({id:'RES /?',endpoint:'/base/api/resumes',fetchImpl:async(url,options)=>{
    assert.equal(url,'/base/api/resumes?id=RES%20%2F%3F');
    assert.equal(options.credentials,'same-origin');assert.equal(options.cache,'no-store');
    return Response.json(result);
  }}),result);
});
test('successful empty collection differs from malformed and failed reads', async () => {
  assert.deepEqual((await loadResumes({fetchImpl:async()=>Response.json({resumes:[]})})).resumes,[]);
  for (const value of [{},null,{resumes:[null]},{resumes:[{}]}]) {
    await assert.rejects(loadResumes({fetchImpl:async()=>Response.json(value)}),/응답/);
  }
  await assert.rejects(loadResumes({fetchImpl:async()=>new Response('bad')}),/응답/);
  for(const status of [401,403,404,503])await assert.rejects(loadResumes({fetchImpl:async()=>Response.json({error:'안내된 조회 오류'},{status})}),/안내된 조회 오류/);
  await assert.rejects(loadResumes({id:'missing',fetchImpl:async()=>Response.json({resumes:[]})}),/선택한 이력서/);
});
test('stalled resume network and response body time out without enabling an empty editor', async () => {
  for(const phase of ['network','body']){
    let signal;
    await assert.rejects(loadResumes({timeoutMs:5,fetchImpl:async(_,options)=>{
      signal=options.signal;
      return phase==='network'?new Promise(()=>{}):{ok:true,json:()=>new Promise(()=>{})};
    }}),/응답이 지연/);
    assert.equal(signal.aborted,true);
  }
});
test('unmount cancellation terminates even an uncooperative request', async () => {
  const controller=new AbortController();
  const pending=loadResumes({signal:controller.signal,fetchImpl:async()=>new Promise(()=>{})});
  controller.abort();await assert.rejects(pending,/취소/);
});
test('failed read can be retried successfully', async () => {
  await assert.rejects(loadResumes({fetchImpl:async()=>{throw new TypeError('offline');}}),/연결하지 못했습니다/);
  const result={resumes:[{id:'saved'}]};
  assert.deepEqual(await loadResumes({fetchImpl:async()=>Response.json(result)}),result);
});
test('save completion requires an explicit server acknowledgement and ID', () => {
  for(const result of [null,{}, {saved:true}, {id:'id'}, {saved:false,id:'id'},{saved:true,id:''}])assert.throws(()=>requireResumeSave(result),/저장 완료 응답/);
  assert.deepEqual(requireResumeSave({saved:true,id:'RES-1'}),{saved:true,id:'RES-1'});
});
