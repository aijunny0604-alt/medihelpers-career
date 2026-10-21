import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { requestMemberRefund } from './accountWorkflowApi.js';

const recoverySource=readFileSync(new URL('./AccountRecoveryPage.jsx',import.meta.url),'utf8');
const memberSource=readFileSync(new URL('./MemberCenterPage.jsx',import.meta.url),'utf8');
const event=values=>({preventDefault(){},currentTarget:values});

function recoveryHarness(request) {
  let source=recoverySource.slice(recoverySource.indexOf('const genericMessage'),recoverySource.indexOf('  return <div className="recovery-page">'));
  source=source.replace('export default function AccountRecoveryPage()', 'function AccountRecoveryPage()')+
    'return {requestRecovery,resetPassword,switchMode,mode,requestResult,doneText,submitting,error,resetComplete}; } globalThis.render=AccountRecoveryPage;';
  const state=[];let index=0, cleanup;
  const context={URLSearchParams,window:{location:{search:''},history:{replaceState(){context.historyChanged=true;}}},
    useMemo:fn=>fn(),useState:initial=>{const i=index++;if(!(i in state))state[i]=initial;return [state[i],x=>state[i]=x];},
    useRef:initial=>{const i=index++;return state[i] ||= {current:initial};},
    useEffect:fn=>{if(!cleanup)cleanup=fn();},
    FormData:class {constructor(values){this.values=values;}get(key){return this.values[key] || '';}},
    requestAccountRecovery:request,withBase:x=>x};
  vm.createContext(context);vm.runInContext(source,context);
  return {render:()=>{index=0;return context.render();},unmount:()=>cleanup(),context};
}

test('복구 중복 제출과 진행 중 탭 전환을 차단하고 원 요청 종류를 표시한다',async()=>{
  let finish,calls=0,body;
  const h=recoveryHarness(value=>{calls++;body=value;return new Promise(resolve=>{finish=resolve;});});
  let page=h.render();
  const first=page.requestRecovery(event({name:'합성 이름',phone:'0000000000'}));
  await page.requestRecovery(event({name:'중복',phone:'0000000000'}));
  page.switchMode('password');
  assert.equal(h.render().mode,'id');
  assert.equal(calls,1);
  finish({accepted:true,emailDeliveryAvailable:true});await first;
  page=h.render();
  assert.equal(body.requestType,'id');
  assert.equal(page.requestResult.requestType,'id');
  assert.match(page.doneText,/아이디 안내/);
  assert.equal(page.submitting,false);
  page.switchMode('password');
  assert.equal(h.render().mode,'password');
  assert.equal(h.render().requestResult,null);
});

test('복구 실패는 완료 상태를 만들지 않고 잠금을 해제해 재시도할 수 있다',async()=>{
  let calls=0;
  const values={name:'합성 이름',phone:'0000000000'};
  const h=recoveryHarness(async()=>{calls++;if(calls===1)throw Error('결과 확인 필요');return {accepted:true};});
  await h.render().requestRecovery(event(values));
  assert.equal(h.render().requestResult,null);assert.equal(h.render().submitting,false);
  assert.equal(h.render().error,'결과 확인 필요');
  assert.deepEqual(values,{name:'합성 이름',phone:'0000000000'});
  await h.render().requestRecovery(event(values));
  assert.equal(h.render().requestResult.requestType,'id');assert.equal(calls,2);
});

test('화면을 떠난 뒤 복구 응답은 완료 상태를 설정하지 않는다',async()=>{
  let finish;
  const h=recoveryHarness(()=>new Promise(resolve=>{finish=resolve;}));
  const first=h.render().requestRecovery(event({name:'합성',phone:'0000000000'}));
  h.unmount();finish({accepted:true});await first;
  assert.equal(h.render().requestResult,null);
});

test('비밀번호 불일치·실패에서 완료되지 않고 동일 입력을 보존하며 중복 변경을 막는다',async()=>{
  let finish,calls=0;
  const h=recoveryHarness(()=>{calls++;return new Promise((_,reject)=>{finish=reject;});});
  await h.render().resetPassword(event({password:'Synthetic1',passwordConfirm:'Synthetic2'}));
  assert.equal(calls,0);assert.equal(h.render().submitting,false);
  const values={password:'Synthetic1',passwordConfirm:'Synthetic1'};
  const first=h.render().resetPassword(event(values));
  await h.render().resetPassword(event(values));assert.equal(calls,1);
  finish(Error('변경 결과 확인 필요'));await first;
  assert.equal(h.render().resetComplete,false);assert.equal(h.render().submitting,false);
  assert.equal(h.context.historyChanged,undefined);assert.equal(values.password,'Synthetic1');
});

function refundHarness(fetchImpl, refresh=true) {
  const start=memberSource.indexOf('  const submitRefund = async (orderNumber) => {');
  const stop=memberSource.indexOf('\n  };',start)+5;
  const context={refundReason:'합성 환불 사유',refundLock:{current:false},setRefundBusy:value=>context.busy=value,
    setRefundMsg:value=>context.message=value,setServerData:fn=>context.data=fn(context.data),
    setRefundFor:value=>context.refundFor=value,setRefundReason:value=>context.refundReason=value,
    refreshPaymentDetails:async()=>refresh,
    requestMemberRefund:(order,reason)=>requestMemberRefund(order,reason,{fetchImpl}),
    data:{orders:[{orderNumber:'SYNTHETIC-ORDER'}],refunds:[]}};
  vm.createContext(context);vm.runInContext(memberSource.slice(start,stop).replace('const submitRefund =','globalThis.submitRefund ='),context);
  return context;
}

for (const [name,fetchImpl] of [
  ['HTML',async()=>new Response('<html>gateway</html>')],
  ['실패 플래그',async()=>Response.json({requested:false})],
  ['다른 주문',async()=>Response.json({requested:true,refundId:'fake',orderNumber:'OTHER'})],
]) test(`환불 ${name} 응답에서 사유·원장을 유지하고 완료 표시하지 않는다`,async()=>{
  const h=refundHarness(fetchImpl);await h.submitRefund('SYNTHETIC-ORDER');
  assert.match(h.message,/접수 결과를 확인하지 못했습니다/);
  assert.equal(h.refundReason,'합성 환불 사유');assert.equal(h.data.refunds.length,0);
  assert.equal(h.refundFor,undefined);assert.equal(h.busy,false);assert.equal(h.refundLock.current,false);
});

test('환불 접수 중복 클릭은 한 번만 전송하고 확인된 접수만 추가한다',async()=>{
  let finish,calls=0;
  const h=refundHarness(()=>{calls++;return new Promise(resolve=>{finish=resolve;});});
  const first=h.submitRefund('SYNTHETIC-ORDER');await h.submitRefund('SYNTHETIC-ORDER');
  assert.equal(calls,1);
  finish(Response.json({requested:true,refundId:'synthetic-refund-1',orderNumber:'SYNTHETIC-ORDER'}));await first;
  assert.equal(h.data.refunds.length,1);assert.equal(h.data.refunds[0].id,'synthetic-refund-1');
  assert.equal(h.refundReason,'');assert.equal(h.refundFor,null);assert.equal(h.busy,false);
});

test('환불 접수 후 목록 조회 실패는 접수 성공과 조회 실패를 구분한다',async()=>{
  const h=refundHarness(async()=>Response.json({requested:true,refundId:'synthetic-refund-1',orderNumber:'SYNTHETIC-ORDER'}),false);
  await h.submitRefund('SYNTHETIC-ORDER');
  assert.equal(h.data.refunds.length,1);assert.match(h.message,/접수되었지만 최신 내역을 불러오지 못했습니다/);
});
