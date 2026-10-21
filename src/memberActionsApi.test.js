import test from 'node:test';
import assert from 'node:assert/strict';
import { saveMemberPreferences, markMemberNotificationsRead, setMemberPostVisibility, deleteMemberPost, createApplicationResume, submitMemberConsultation } from './accountWorkflowApi.js';

const profile={displayName:'합성 이름',phone:'000-0000-0000',organization:'합성 기관',jobTitle:'합성 담당자'};
const notifications={email:true,sms:false,service:true,marketing:false};
const cases=[
  ['회원정보',options=>saveMemberPreferences({profile,notifications},options),{saved:true,profile,notifications},'PATCH'],
  ['알림 읽음',options=>markMemberNotificationsRead('SYNTHETIC-ALERT',false,options),{updated:true},'POST'],
  ['구직글 공개',options=>setMemberPostVisibility('SYNTHETIC-POST','closed','synthetic',options),{saved:true,post:{id:'SYNTHETIC-POST',status:'closed'}},'PATCH'],
  ['구직글 삭제',options=>deleteMemberPost('SYNTHETIC-POST',options),{deleted:true,id:'SYNTHETIC-POST'},'DELETE'],
  ['지원용 이력서',options=>createApplicationResume({name:'합성 이름'},options),{saved:true,id:'SYNTHETIC-RESUME'},'POST'],
  ['상담 접수',options=>submitMemberConsultation({requestType:'hospital'},options),{saved:true,id:'SYNTHETIC-CONSULTATION'},'POST'],
];
for(const [label,run,success,method] of cases){
  test(`${label}: 서버 성공 계약을 확인하고 같은 출처와 요청 방식을 유지한다`,async()=>{
    let request;
    assert.deepEqual(await run({fetchImpl:async(path,init)=>{request={path,...init};return {ok:true,json:async()=>success};}}),success);
    assert.equal(request.method,method);assert.equal(request.credentials,'same-origin');assert.ok(request.signal);
  });
  for(const payload of [{},{saved:false,updated:false,deleted:false,id:'FAILED'},null,[]]){
    test(`${label}: HTTP 200의 불완전·실패 응답 ${JSON.stringify(payload)}를 거부한다`,async()=>{
      await assert.rejects(run({fetchImpl:async()=>({ok:true,json:async()=>payload})}),error=>error.code==='SUBMISSION_RESULT_UNKNOWN');
    });
  }
  test(`${label}: 만료 세션 오류 안내를 전달한다`,async()=>{
    await assert.rejects(run({fetchImpl:async()=>({ok:false,status:401,json:async()=>({error:'로그인이 만료되었습니다.'})})}),/로그인이 만료/);
  });
  for(const failure of ['broken-json','network','headers-timeout','body-timeout']){
    test(`${label}: ${failure}에서 자동 재전송 없이 결과 확인을 안내한다`,async()=>{
      let calls=0,signal;
      const fetchImpl=async(_path,init)=>{
        calls++;signal=init.signal;
        if(failure==='network')throw Error('offline');
        if(failure==='headers-timeout')return new Promise(()=>{});
        return {ok:true,json:async()=>{if(failure==='broken-json')throw Error('broken');return new Promise(()=>{});}};
      };
      await assert.rejects(run({fetchImpl,timeoutMs:5}),error=>error.code==='SUBMISSION_RESULT_UNKNOWN');
      assert.equal(calls,1);if(failure.endsWith('timeout'))assert.equal(signal.aborted,true);
    });
  }
}

test('다른 구직글 또는 다른 공개 상태가 돌아오면 성공으로 처리하지 않는다',async()=>{
  const respond=result=>({fetchImpl:async()=>({ok:true,json:async()=>result})});
  for(const post of [{id:'OTHER',status:'closed'},{id:'SYNTHETIC-POST',status:'active'}]){
    await assert.rejects(setMemberPostVisibility('SYNTHETIC-POST','closed','synthetic',respond({saved:true,post})),error=>error.code==='SUBMISSION_RESULT_UNKNOWN');
  }
  await assert.rejects(deleteMemberPost('SYNTHETIC-POST',respond({deleted:true,id:'OTHER'})),error=>error.code==='SUBMISSION_RESULT_UNKNOWN');
});

test('회원정보 응답의 프로필·선택 동의는 온전한 자료여야 한다',async()=>{
  for(const result of [{saved:true,profile:{},notifications},{saved:true,profile,notifications:{...notifications,marketing:'true'}}]){
    await assert.rejects(saveMemberPreferences({profile,notifications},{fetchImpl:async()=>({ok:true,json:async()=>result})}),error=>error.code==='SUBMISSION_RESULT_UNKNOWN');
  }
});

test('상담·이력서 성공 응답에는 유효한 접수 번호가 필요하다',async()=>{
  for(const id of ['',23,'../other',' padded ','<script>']){
    const options={fetchImpl:async()=>({ok:true,json:async()=>({saved:true,id})})};
    await assert.rejects(submitMemberConsultation({},options),error=>error.code==='SUBMISSION_RESULT_UNKNOWN');
    await assert.rejects(createApplicationResume({},options),error=>error.code==='SUBMISSION_RESULT_UNKNOWN');
  }
});

test('모두 읽음은 개별 알림 번호를 보내지 않는다',async()=>{
  let body;
  await markMemberNotificationsRead(undefined,true,{fetchImpl:async(_path,init)=>{body=JSON.parse(init.body);return {ok:true,json:async()=>({updated:true})};}});
  assert.deepEqual(body,{action:'notifications_read_all'});
});
