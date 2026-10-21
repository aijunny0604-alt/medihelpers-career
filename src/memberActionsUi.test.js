import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as api from './accountWorkflowApi.js';

const source=readFileSync(new URL('./MemberCenterPage.jsx',import.meta.url),'utf8');
const consultationSource=readFileSync(new URL('./HeadHunterRequestPage.jsx',import.meta.url),'utf8');
const extract=(name,text=source)=>{
  const start=text.indexOf(`  const ${name} = async (`);
  assert.ok(start>=0);
  return text.slice(start,text.indexOf('\n  };',start)+5).replace(`const ${name} =`,`globalThis.${name} =`);
};
const profile={displayName:'합성 이름',phone:'000-0000-0000',organization:'합성 기관',jobTitle:'합성 담당자'};
const preferences={email:false,sms:false,service:true,marketing:false};
const alert={id:'SYNTHETIC-ALERT',readAt:null,actionUrl:'/mypage/inquiries/SYNTHETIC'};
const post={id:'SYNTHETIC-POST',status:'active'};
const good={saveProfile:{saved:true,profile,notifications:preferences},markAlertRead:{updated:true},toggleJobSeekerPost:{saved:true,post:{...post,status:'closed'}},deleteJobSeekerPost:{deleted:true,id:post.id}};
const event=()=>({preventDefault(){},currentTarget:{...profile,privacy:'agreed',message:'입력 보존 검수'}});
const helperMethods={saveMemberPreferences:1,markMemberNotificationsRead:2,setMemberPostVisibility:3,deleteMemberPost:1,createApplicationResume:1,submitMemberConsultation:1};
const ticks=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};

function harness(fetchImpl){
  const state={saved:'',error:'',busy:false,postBusy:'',alertBusy:false,done:'',stored:[],calls:0,notices:[],events:[],invalidated:0,profile:{...profile},preferences:{...preferences},
    data:{alerts:[{...alert},{id:'SECOND',readAt:null}],unreadCount:2,jobSeekerPosts:[{...post}]}};
  const context={qa:{active:false},saveLock:{current:false},postLock:{current:false},alertReadLock:{current:false},submitLock:{current:false},applicationResumeRef:{current:null},
    currentProfile:profile,notifications:preferences,PRIVACY_FORM_VERSION:'synthetic-only',
    setSaved:value=>state.saved=value,setSaveBusy:value=>state.busy=value,setPostBusy:value=>state.postBusy=value,setAlertReadBusy:value=>state.alertBusy=value,
    setProfile:value=>state.profile=value,setNotifications:value=>state.preferences=value,setServerData:fn=>state.data=fn(state.data),
    FormData:class{constructor(value){this.value={...value};}get(key){return this.value[key];}delete(key){delete this.value[key];}entries(){return Object.entries(this.value);}},
    withBase:path=>path,confirmAction:async()=>true,invalidateSiteOperations:()=>state.invalidated++,notify:(message,tone)=>state.notices.push({message,tone}),
    CustomEvent:class{constructor(type){this.type=type;}},window:{dispatchEvent:event=>state.events.push(event.type),location:{href:'unchanged'},scrollTo(){}},
    access:'allowed',qaAllowed:false,isDoctor:false,isHeadhuntPostInquiry:false,isDirectApplication:false,selectedResumeId:'',resumes:[],recipient:'',appliedJobId:'',headhuntPostId:'',
    setSubmitting:value=>state.busy=value,setSubmitError:value=>state.error=value,setDone:value=>state.done=value,setResumes:value=>state.resumes=value,setSelectedResumeId:value=>state.selectedResumeId=value,
    appendStoredRecord:(key,value)=>state.stored.push(value),accountProfile:{},
  };
  const wrappedFetch=async(...args)=>{state.calls++;return fetchImpl(...args);};
  for(const [name,argCount] of Object.entries(helperMethods))context[name]=(...args)=>api[name](...args.slice(0,argCount),{fetchImpl:wrappedFetch,timeoutMs:8});
  vm.createContext(context);
  for(const name of Object.keys(good))vm.runInContext(extract(name),context);
  vm.runInContext(extract('submit',consultationSource),context);
  return {state,context};
}
const call=(context,name)=>context[name](name==='saveProfile'?event():name==='markAlertRead'?alert:post);

for(const name of Object.keys(good)){
  for(const failure of ['failed-object','broken-json','session-expired','timeout']){
    test(`${name}: ${failure}이면 성공 안내·목록 변경·이동 없이 잠금을 해제한다`,async()=>{
      const h=harness(async()=>{
        if(failure==='timeout')return new Promise(()=>{});
        return {ok:failure!=='session-expired',status:401,json:async()=>{if(failure==='broken-json')throw Error('broken');return failure==='session-expired'?{error:'로그인이 만료되었습니다.'}:{saved:false,updated:false,deleted:false};}};
      });
      await call(h.context,name);
      assert.equal(h.state.calls,1);assert.equal(h.state.data.unreadCount,2);assert.equal(h.state.data.jobSeekerPosts.length,1);assert.equal(h.state.data.jobSeekerPosts[0].status,'active');
      assert.equal(h.context.window.location.href,'unchanged');assert.equal(h.state.invalidated,0);assert.deepEqual(h.state.events,[]);
      assert.equal(h.state.busy,false);assert.equal(h.state.postBusy,'');assert.equal(h.state.alertBusy,false);
      assert.ok(h.state.saved || h.state.notices[0]?.message);assert.doesNotMatch(h.state.saved,/저장되었습니다/);assert.ok(h.state.notices.every(x=>x.tone!=='ok'));
      assert.deepEqual(h.state.profile,profile);assert.deepEqual(h.state.preferences,preferences);
    });
  }
  test(`${name}: 대기 중 중복 요청을 막고 확정된 응답 뒤에만 성공 처리한다`,async()=>{
    let finish;
    const h=harness(()=>new Promise(resolve=>finish=()=>resolve({ok:true,json:async()=>good[name]})));
    const first=call(h.context,name);const second=call(h.context,name);await ticks();
    assert.equal(h.state.calls,1);assert.equal(h.state.saved,'');assert.equal(h.state.notices.length,0);
    finish();await Promise.all([first,second]);
    if(name==='saveProfile')assert.equal(h.state.saved,'저장되었습니다.');
    if(name==='markAlertRead'){assert.equal(h.state.data.unreadCount,1);assert.equal(h.context.window.location.href,alert.actionUrl);}
    if(name==='toggleJobSeekerPost')assert.equal(h.state.data.jobSeekerPosts[0].status,'closed');
    if(name==='deleteJobSeekerPost')assert.equal(h.state.data.jobSeekerPosts.length,0);
  });
}

test('이미 읽은 알림의 오래된 클릭 객체로 재실행해도 다른 알림 수가 줄지 않는다',async()=>{
  const h=harness(async()=>({ok:true,json:async()=>({updated:true})}));
  await h.context.markAlertRead(alert);await h.context.markAlertRead(alert);
  assert.equal(h.state.data.unreadCount,1);assert.equal(h.state.data.alerts[1].readAt,null);
});

test('개별 읽음 대기 중 모두 읽음이 경합하지 않으며 다음 요청은 정상 반영된다',async()=>{
  let finish;
  const h=harness(()=>new Promise(resolve=>finish=()=>resolve({ok:true,json:async()=>({updated:true})})));
  const first=h.context.markAlertRead(alert);await h.context.markAlertRead(null,true);assert.equal(h.state.calls,1);
  finish();await first;
  const all=h.context.markAlertRead(null,true);finish();await all;assert.equal(h.state.data.unreadCount,0);
});

test('삭제 확인 취소·중복 확인은 요청을 보내지 않고 다른 게시 작업 잠금을 해제한다',async()=>{
  const h=harness(async()=>{throw Error('호출하면 안 됨');});let finish,confirms=0;
  h.context.confirmAction=()=>{confirms++;return new Promise(resolve=>finish=resolve);};
  const first=h.context.deleteJobSeekerPost(post);await h.context.deleteJobSeekerPost(post);await h.context.toggleJobSeekerPost(post);
  assert.equal(confirms,1);assert.equal(h.state.calls,0);finish(false);await first;
  assert.equal(h.context.postLock.current,false);assert.equal(h.state.postBusy,'');assert.equal(h.state.data.jobSeekerPosts.length,1);
});

for(const failure of ['failed-id','empty','broken-json','session-expired','timeout']){
  test(`실제 상담 신청 ${failure}: 완료·이력 저장 없이 입력을 유지한다`,async()=>{
    const h=harness(async()=>{
      if(failure==='timeout')return new Promise(()=>{});
      return {ok:failure!=='session-expired',json:async()=>{if(failure==='broken-json')throw Error('broken');if(failure==='session-expired')return {error:'로그인이 만료되었습니다.'};return failure==='empty'?{}:{saved:false,id:'FAILED'};}};
    });
    const input=event();const before=JSON.stringify(input.currentTarget);await h.context.submit(input);
    assert.equal(h.state.done,'');assert.deepEqual(h.state.stored,[]);assert.ok(h.state.error);assert.equal(h.state.busy,false);assert.equal(h.context.submitLock.current,false);assert.equal(JSON.stringify(input.currentTarget),before);
  });
}

test('실제 상담 신청은 처리 중 중복 접수를 막고 서버 번호로만 완료한다',async()=>{
  let finish;const h=harness(()=>new Promise(resolve=>finish=()=>resolve({ok:true,json:async()=>({saved:true,id:'CONSULTATION-SYNTHETIC'})})));
  const first=h.context.submit(event());await h.context.submit(event());assert.equal(h.state.calls,1);
  finish();await first;assert.equal(h.state.done,'CONSULTATION-SYNTHETIC');assert.equal(h.state.stored.length,1);
});

test('지원용 이력서 저장 실패는 상담 전송을 차단한다',async()=>{
  const h=harness(async()=>({ok:true,json:async()=>({saved:false,id:'FAILED'})}));
  Object.assign(h.context,{isDoctor:true,isDirectApplication:true,appliedJobId:'SYNTHETIC-JOB'});
  await h.context.submit(event());assert.equal(h.state.calls,1);assert.equal(h.state.done,'');assert.equal(h.context.applicationResumeRef.current,null);assert.ok(h.state.error);
});

test('지원용 이력서 저장 뒤 상담이 실패해도 재시도 시 같은 이력서를 재사용한다',async()=>{
  let consultationAttempts=0;const paths=[],bodies=[];
  const h=harness(async(path,init)=>{
    paths.push(path);bodies.push(JSON.parse(init.body));
    if(path==='/api/resumes')return {ok:true,json:async()=>({saved:true,id:'RESUME-SYNTHETIC'})};
    consultationAttempts++;return {ok:consultationAttempts>1,json:async()=>consultationAttempts>1?{saved:true,id:'CONSULTATION-SYNTHETIC'}:{error:'합성 접수 실패'}};
  });
  Object.assign(h.context,{isDoctor:true,isDirectApplication:true,appliedJobId:'SYNTHETIC-JOB'});
  await h.context.submit(event());assert.equal(h.state.done,'');assert.equal(h.state.selectedResumeId,'RESUME-SYNTHETIC');
  await h.context.submit(event());assert.equal(h.state.done,'CONSULTATION-SYNTHETIC');
  assert.deepEqual(paths,['/api/resumes','/api/consultations','/api/consultations']);
  assert.equal(bodies[1].payload.resumeId,'RESUME-SYNTHETIC');assert.equal(bodies[2].payload.resumeId,'RESUME-SYNTHETIC');
});

test('권한 확인 중 또는 다른 회원 유형이면 상담 요청을 보내지 않는다',async()=>{
  const h=harness(async()=>{throw Error('호출하면 안 됨');});
  for(const access of ['checking','blocked']){h.context.access=access;await h.context.submit(event());}
  assert.equal(h.state.calls,0);assert.equal(h.state.done,'');assert.equal(h.context.submitLock.current,false);
});

test('회원정보 시간 초과 뒤 도착한 성공 응답은 실패 안내나 입력을 덮어쓰지 않는다',async()=>{
  let finish;
  const h=harness(()=>new Promise(resolve=>finish=()=>resolve({ok:true,json:async()=>good.saveProfile})));
  await h.context.saveProfile(event());const message=h.state.saved;
  assert.ok(message);assert.doesNotMatch(message,/저장되었습니다/);
  finish();await ticks();assert.equal(h.state.saved,message);assert.deepEqual(h.state.events,[]);assert.deepEqual(h.state.profile,profile);
});

test('상담 본문 수신 시간 초과 뒤 도착한 성공 응답은 완료 화면을 만들지 않는다',async()=>{
  let finish;
  const h=harness(async()=>({ok:true,json:()=>new Promise(resolve=>finish=()=>resolve({saved:true,id:'LATE-CONSULTATION'}))}));
  await h.context.submit(event());const message=h.state.error;
  assert.ok(message);finish();await ticks();assert.equal(h.state.error,message);assert.equal(h.state.done,'');assert.deepEqual(h.state.stored,[]);
});

test('HTTP 실패로 거절된 상담은 입력을 바꿔 재시도할 수 있다',async()=>{
  let attempt=0;const bodies=[];
  const h=harness(async(_path,init)=>{bodies.push(JSON.parse(init.body));attempt++;return {ok:attempt>1,json:async()=>attempt>1?{saved:true,id:'RETRY-CONSULTATION'}:{error:'입력 내용을 확인해주세요.'}};});
  const input=event();await h.context.submit(input);assert.equal(h.state.done,'');assert.ok(h.state.error);
  input.currentTarget.message='수정한 합성 내용';await h.context.submit(input);
  assert.equal(h.state.done,'RETRY-CONSULTATION');assert.equal(h.state.error,'');assert.equal(bodies[1].payload.message,'수정한 합성 내용');assert.equal(h.state.stored.length,1);
});
