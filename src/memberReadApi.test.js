import test from 'node:test';
import assert from 'node:assert/strict';
import { loadMemberCenter, loadMemberPaymentDetails, loadTalentContactPreview } from './memberReadApi.js';

const member = {signedIn:true,account:{role:'hospital'},orders:[],refunds:[]};
const preview = {available:true,contactVisibility:'ticket',isDemo:false};
const calls = [
  ['회원 목록', options=>loadMemberCenter(options), member, '/api/member-center'],
  ['결제 목록', options=>loadMemberPaymentDetails(options), member, '/api/member-center'],
  ['인재 공개범위', options=>loadTalentContactPreview('seeker-SYNTHETIC',options), preview, '/api/talent-detail/seeker-SYNTHETIC?preview=1'],
];

for(const [name,run,data,path] of calls) {
  test(`${name} 정상 응답은 캐시 없는 동일 출처 GET으로 검증한다`,async()=>{
    assert.deepEqual(await run({fetchImpl:async(url,init)=>{
      assert.equal(url,path);assert.equal(init.method,'GET');assert.equal(init.credentials,'same-origin');
      assert.equal(init.cache,'no-store');assert.equal(init.signal.aborted,false);return Response.json(data);
    }}),data);
  });
  for(const body of [false,true]) test(`${name} ${body?'본문':'요청'} 무응답을 중단하고 다음 조회로 복구한다`,async()=>{
    let signal;
    await assert.rejects(run({timeoutMs:5,fetchImpl:async(_,init)=>{
      signal=init.signal;return body?{ok:true,json:()=>new Promise(()=>{})}:new Promise(()=>{});
    }}),{code:'MEMBER_READ_TIMEOUT'});
    assert.equal(signal.aborted,true);
    assert.deepEqual(await run({fetchImpl:async()=>Response.json(data)}),data);
  });
  test(`${name} 외부 취소는 abort를 무시하는 전송도 즉시 종료한다`,async()=>{
    const controller=new AbortController();let signal;
    const pending=run({signal:controller.signal,fetchImpl:async(_,init)=>{signal=init.signal;return new Promise(()=>{});}});
    controller.abort();await assert.rejects(pending,{name:'AbortError'});assert.equal(signal.aborted,true);
  });
  test(`${name} 미리 취소된 조회는 전송하지 않는다`,async()=>{
    const controller=new AbortController();controller.abort();let count=0;
    await assert.rejects(run({signal:controller.signal,fetchImpl:async()=>{count++;}}),{name:'AbortError'});assert.equal(count,0);
  });
  test(`${name} HTTP 실패·HTML·손상 응답을 성공으로 반환하지 않는다`,async()=>{
    for(const response of [Response.json(data,{status:401}),new Response('<html>gateway</html>'),Response.json(null),Response.json([])]) {
      await assert.rejects(run({fetchImpl:async()=>response}),/확인|불러오지/);
    }
  });
}

test('회원 응답은 역할·서명된 로그인·목록 항목 계약을 확인한다',async()=>{
  for(const invalid of [{...member,signedIn:'true'},{...member,account:{role:'guest'}},{...member,orders:[null]},
    {...member,refunds:[[]]},{...member,alerts:'broken'},{...member,profile:'broken'},{...member,orders:null}]) {
    await assert.rejects(loadMemberCenter({fetchImpl:async()=>Response.json(invalid)}));
  }
});

test('인재 공개범위가 손상되면 연락처 제공을 추정하지 않는다',async()=>{
  for(const invalid of [{...preview,available:'false'},{...preview,contactVisibility:'public'},
    {...preview,isDemo:'false'},{available:true}]) {
    await assert.rejects(loadTalentContactPreview('SYNTHETIC',{fetchImpl:async()=>Response.json(invalid)}));
  }
  assert.equal((await loadTalentContactPreview('SYNTHETIC',{fetchImpl:async()=>Response.json({...preview,contactVisibility:'private'})})).contactVisibility,'private');
});

test('기본 조회 제한은 본문을 포함한 12초이며 종료 후 타이머를 정리한다',async()=>{
  const originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout;
  let timeout,callback,cleared=false;
  globalThis.setTimeout=(fn,ms)=>{callback=fn;timeout=ms;return 123;};
  globalThis.clearTimeout=id=>{assert.equal(id,123);cleared=true;};
  try {
    const pending=loadMemberCenter({fetchImpl:async()=>({ok:true,json:()=>new Promise(()=>{})})});
    await Promise.resolve();assert.equal(timeout,12000);callback();
    await assert.rejects(pending,{code:'MEMBER_READ_TIMEOUT'});assert.equal(cleared,true);
  } finally {globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear;}
});
