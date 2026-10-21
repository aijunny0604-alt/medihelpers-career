import test from 'node:test';
import assert from 'node:assert/strict';
import { saveHospitalAd } from './hospitalAdUpdate.js';
const response=(result,ok=true)=>({ok,json:async()=>result});
const content={title:'검수용 공고',banner:'/api/uploads/hospitals/a/banner/b.png'};
test('저장 성공은 updated true와 요청 공고 ID를 함께 확인한다',async()=>{
  let request;
  const result=await saveHospitalAd('record-1',content,{fetcher:async(url,options)=>{request=JSON.parse(options.body);return response({updated:true,content:{id:'record-1'}});}});
  assert.equal(result.updated,true);assert.equal(request.action,'owned_ad_update');assert.deepEqual(request.content,content);
});
test('updated 문자열·누락·다른 공고·내용 없는 성공 응답을 완료로 표시하지 않는다',async()=>{
  for(const result of [{updated:'false',content:{id:'record-1'}},{updated:'true',content:{id:'record-1'}},{updated:true},{updated:true,content:{id:'record-2'}},{},null]) {
    await assert.rejects(saveHospitalAd('record-1',content,{fetcher:async()=>response(result)}),/저장 결과/);
  }
});
test('서버 거부는 원래 오류를 보여주고 입력 객체를 유지한다',async()=>{
  const original=structuredClone(content);
  await assert.rejects(saveHospitalAd('record-1',content,{fetcher:async()=>response({error:'권한이 없습니다'},false)}),/권한/);
  assert.deepEqual(content,original);
});
test('네트워크·JSON 실패는 결과 불명으로 안내한다',async()=>{
  for(const fetcher of [async()=>{throw new Error('offline');},async()=>({ok:true,json:async()=>{throw new SyntaxError('HTML');}})]) {
    await assert.rejects(saveHospitalAd('record-1',content,{fetcher}),/내 공고에서 반영 여부/);
  }
});
test('응답 본문까지 시간 제한을 적용하며 자동 재전송하지 않는다',async()=>{
  let sent=0,signal;
  await assert.rejects(saveHospitalAd('record-1',content,{timeoutMs:5,fetcher:async(_,options)=>{sent++;signal=options.signal;return {ok:true,json:()=>new Promise(()=>{})};}}),/입력 내용은 유지/);
  assert.equal(sent,1);assert.equal(signal.aborted,true);
});
