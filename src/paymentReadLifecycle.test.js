import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadMemberCenter,loadTalentContactPreview} from './memberReadApi.js';

const source=file=>readFileSync(new URL(file,import.meta.url),'utf8').replaceAll('\r\n','\n');
const main=source('./main.jsx'),member=source('./MemberCenterPage.jsx');
const invoke=(body,deps)=>new Function(...Object.keys(deps),body)(...Object.values(deps));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const waitFor=async predicate=>{for(let i=0;i<40&&!predicate();i++)await new Promise(r=>setTimeout(r,5));assert.ok(predicate());};
const previewBody=main.slice(main.indexOf('function TalentUnlockCheckout(')).match(/const \[previewRetry[^\n]*\n  useEffect\(\(\) => \{([\s\S]*?)\n  \},\[talentId, previewRetry\]\);/)[1];
const initialBody=member.match(/useEffect\(\(\) => \{\n    if \(qa.active\) return;([\s\S]*?)\n  \}, \[qa.active, auth\?\.status, auth\?\.role, auth\?\.isAdmin[^\n]*\]\);/)[1];
const validMember={signedIn:true,account:{role:'hospital'},orders:[],refunds:[],identity:{email:'qa@example.invalid'}};
const validPreview={available:true,contactVisibility:'private',isDemo:false};

for(const bodyStalls of [false,true]) test(`인재 공개범위 ${bodyStalls?'본문':'요청'} 무응답은 오류로 풀리고 재시도에서 정상 복구한다`,async()=>{
  let state,signal,calls=0;
  const deps={talentId:'seeker-SYNTHETIC',setContactPreview:value=>state=value,
    loadTalentContactPreview:(id,options)=>loadTalentContactPreview(id,{...options,timeoutMs:5,fetchImpl:async(_,init)=>{
      signal=init.signal;calls++;return bodyStalls?{ok:true,json:()=>new Promise(()=>{})}:new Promise(()=>{});
    }})};
  const cleanup=invoke(previewBody,deps);assert.equal(state.loading,true);
  await waitFor(()=>state.loading===false);assert.match(state.error,/다시 확인/);assert.equal(signal.aborted,true);assert.equal(calls,1);
  cleanup();
  deps.loadTalentContactPreview=(id,options)=>loadTalentContactPreview(id,{...options,fetchImpl:async()=>Response.json(validPreview)});
  const cleanupRetry=invoke(previewBody,deps);await waitFor(()=>state.loading===false);
  assert.equal(state.contactVisibility,'private');assert.equal(state.error,undefined);cleanupRetry();
});

test('인재 변경·화면 이탈 뒤 옛 공개범위 응답은 새 화면을 덮지 않는다',async()=>{
  const old=deferred();let state,signal;
  const cleanup=invoke(previewBody,{talentId:'old',setContactPreview:v=>state=v,
    loadTalentContactPreview:(_,options)=>{signal=options.signal;return old.promise;}});
  cleanup();assert.equal(signal.aborted,true);
  const cleanupNew=invoke(previewBody,{talentId:'new',setContactPreview:v=>state=v,loadTalentContactPreview:async()=>validPreview});
  await tick();old.resolve({...validPreview,contactVisibility:'ticket'});await tick();
  assert.equal(state.contactVisibility,'private');cleanupNew();
});

test('특정 인재가 없는 묶음 상품은 불필요한 공개범위 조회를 하지 않는다',()=>{
  let state,calls=0;
  invoke(previewBody,{talentId:'',setContactPreview:v=>state=v,loadTalentContactPreview:()=>calls++})();
  assert.equal(state.loading,false);assert.equal(calls,0);
});

function initialHarness(fetchImpl) {
  const state={};
  const deps={auth:{status:'member',role:'hospital',identity:{email:'qa@example.invalid'}},
    setAccountState:value=>state.account=typeof value==='function'?value(state.account):value,
    setProfile:value=>state.profile=value,setServerData:value=>state.data=value,setNotifications:value=>state.notifications=value,
    sanitizeDisplayData:v=>v,loadMemberCenter:options=>loadMemberCenter({...options,timeoutMs:5,fetchImpl})};
  return {state,start:()=>invoke(initialBody,deps)};
}
for(const bodyStalls of [false,true]) test(`초기 회원 목록 ${bodyStalls?'본문':'요청'} 무응답은 조회 실패로 종료하며 확인된 로그인은 유지한다`,async()=>{
  let calls=0,signal;
  const h=initialHarness(async(_,init)=>{signal=init.signal;calls++;return bodyStalls?{ok:true,json:()=>new Promise(()=>{})}:new Promise(()=>{});});
  const cleanup=h.start();assert.equal(h.state.account.loading,true);
  await waitFor(()=>h.state.account.loading===false);
  assert.equal(h.state.account.signedIn,true);assert.equal(h.state.account.failed,true);assert.equal(calls,1);assert.equal(signal.aborted,true);cleanup();
});

test('초기 회원 목록 정상 응답은 실제 결제 내역과 회원 역할을 반영한다',async()=>{
  const data={...validMember,orders:[{orderNumber:'SYNTHETIC'}]};
  const h=initialHarness(async()=>Response.json(data));const cleanup=h.start();await waitFor(()=>h.state.account.loading===false);
  assert.equal(h.state.account.failed,undefined);assert.equal(h.state.account.role,'hospital');assert.deepEqual(h.state.data.orders,data.orders);cleanup();
});

test('초기 회원 목록 화면 이탈은 조회를 중단하고 늦은 결과를 버린다',async()=>{
  const response=deferred();let signal;
  const h=initialHarness(async(_,init)=>{signal=init.signal;return response.promise;});const cleanup=h.start();cleanup();
  response.resolve(Response.json(validMember));await tick();assert.equal(signal.aborted,true);
  assert.equal(h.state.account.loading,true);assert.equal(h.state.account.failed,undefined);
});

const paymentHandlers=member.slice(member.indexOf('  const refreshPaymentDetails=async'),member.indexOf('\n  useEffect(() => {\n    if (qa.active) return;'));
function paymentHarness(load,request=async()=>({refundId:'REFUND-SYNTHETIC'})) {
  const state={data:{orders:[{orderNumber:'SYNTHETIC',refundPending:0}],refunds:[]}};
  const deps={paymentSession:{active:true,request:null},refundLock:{current:false},refundReason:'합성 환불 사유',
    loadMemberPaymentDetails:load,requestMemberRefund:request,sanitizeDisplayData:v=>v,
    setServerData:fn=>state.data=fn(state.data),setRefundMsg:v=>state.message=v,setPaymentRefreshing:v=>state.refreshing=v,
    setRefundBusy:v=>state.busy=v,setRefundFor:v=>state.refundFor=v,setRefundReason:v=>state.reason=v};
  return {state,deps,...invoke(paymentHandlers+'return {refreshPaymentDetails,submitRefund};',deps)};
}

test('환불 전에 시작된 조회는 취소되며 늦은 결과가 확인된 접수를 지우지 않는다',async()=>{
  const old=deferred(),next=deferred();const signals=[];
  const h=paymentHarness(options=>{signals.push(options.signal);return signals.length===1?old.promise:next.promise;});
  const refreshing=h.refreshPaymentDetails();const submitting=h.submitRefund('SYNTHETIC');await tick();
  assert.equal(signals.length,2);assert.equal(signals[0].aborted,true);
  assert.equal(h.state.data.orders[0].refundPending,1);assert.equal(h.state.data.refunds.length,1);
  old.resolve({orders:[{orderNumber:'SYNTHETIC',refundPending:0}],refunds:[]});assert.equal(await refreshing,false);
  assert.equal(h.state.data.refunds.length,1);assert.equal(h.state.refreshing,true);
  next.resolve({...h.state.data});await submitting;
  assert.equal(h.state.data.refunds.length,1);assert.equal(h.state.refreshing,false);assert.equal(h.state.busy,false);
  assert.match(h.state.message,/환불 요청이 접수되었습니다/);
});

test('결제 내역 중복 새로고침은 한 요청만 보내고 실패해도 기존 내역을 유지한다',async()=>{
  const response=deferred();let calls=0;
  const h=paymentHarness(()=>{calls++;return response.promise;});const first=h.refreshPaymentDetails();
  assert.equal(await h.refreshPaymentDetails(),false);assert.equal(calls,1);
  response.reject(Error('연결 실패'));assert.equal(await first,false);assert.equal(h.state.data.orders.length,1);assert.equal(h.state.refreshing,false);
});

test('회원 전환 또는 화면 이탈 후 결제 목록 응답은 반영하지 않는다',async()=>{
  const response=deferred();const h=paymentHarness(()=>response.promise);const first=h.refreshPaymentDetails();
  h.deps.paymentSession.active=false;h.deps.paymentSession.request.controller.abort();h.deps.paymentSession.request=null;
  response.resolve({orders:[],refunds:[]});assert.equal(await first,false);assert.equal(h.state.data.orders.length,1);
  assert.equal(h.state.message,undefined);
});

test('환불 전송 후 화면 이탈은 새 화면에 접수 상태나 후속 조회를 만들지 않는다',async()=>{
  const response=deferred();let reads=0;
  const h=paymentHarness(async()=>{reads++;},()=>response.promise);const first=h.submitRefund('SYNTHETIC');
  h.deps.paymentSession.active=false;response.resolve({refundId:'REFUND-SYNTHETIC'});await first;
  assert.equal(reads,0);assert.equal(h.state.data.refunds.length,0);assert.equal(h.state.reason,undefined);
});
