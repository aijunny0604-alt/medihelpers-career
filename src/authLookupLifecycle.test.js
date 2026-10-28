import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lookupAccount } from './accountLookup.js';

const source=readFileSync(new URL('./main.jsx',import.meta.url),'utf8');
const hookSource=source.slice(source.indexOf('function useAuthGate('),source.indexOf('function AccountLookupNotice('));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const member=(email='first@example.invalid',role='doctor')=>({signedIn:true,isAdmin:false,account:{role},identity:{email},profile:{name:email},registrationProfile:{owner:email},hospitalProfile:{owner:email}});
const guest={signedIn:false,account:null,identity:{},isAdmin:false};

function mount(lookup) {
  let state;let effect;let updates=0;const listeners={};
  const deps={DEMO_MODE:false,AbortController,lookupAccount:lookup,
    useRef:value=>({current:value}),useState:value=>{state=value;return[value,next=>{state=typeof next==='function'?next(state):next;updates++;}];},
    useEffect:fn=>{effect=fn;},window:{addEventListener:(name,fn)=>{listeners[name]=fn;},removeEventListener:name=>{delete listeners[name];}}};
  const hook=new Function(...Object.keys(deps),`${hookSource};return useAuthGate;`)(...Object.values(deps));
  const auth=hook({active:false});const cleanup=effect();
  return{state:()=>state,updates:()=>updates,retry:auth.retryAccount,cleanup,
    event:result=>listeners['medihelpers:auth-changed']?.({detail:{result}})};
}

test('실제 인증 훅은 최초 실패를 비회원으로 바꾸지 않고 수동 재시도를 제공한다',async()=>{
  let calls=0;const h=mount(async()=>{calls++;throw Error('검수용 조회 실패');});await tick();
  assert.equal(calls,1);assert.equal(h.state().status,'loading');assert.equal(h.state().lookupPending,false);
  assert.equal(h.state().lookupError,'검수용 조회 실패');await tick();assert.equal(calls,1);h.cleanup();
});

test('대기 중 재시도 연속 클릭은 동일 요청을 공유한다',async()=>{
  const pending=deferred();let calls=0;const h=mount(()=>{calls++;return pending.promise;});
  const a=h.retry(),b=h.retry();assert.equal(a,b);assert.equal(calls,1);
  pending.resolve(guest);await a;assert.equal(h.state().status,'guest');assert.equal(h.state().lookupPending,false);h.cleanup();
});

test('실패 후 재시도로 확인된 회원정보가 복구된다',async()=>{
  let calls=0;const h=mount(async()=>{if(++calls===1)throw Error('일시 오류');return member();});await tick();
  const pending=h.retry();assert.equal(h.state().lookupPending,true);assert.equal(h.state().lookupError,'');
  await pending;assert.equal(calls,2);assert.equal(h.state().status,'member');assert.equal(h.state().email,'first@example.invalid');h.cleanup();
});

test('확인된 회원은 재조회 실패 때문에 비회원으로 바뀌거나 개인정보가 지워지지 않는다',async()=>{
  let calls=0;const h=mount(async()=>{if(++calls===1)return member();throw Error('일시 오류');});await tick();
  await h.retry();assert.equal(h.state().status,'member');assert.equal(h.state().profile.name,'first@example.invalid');
  assert.equal(h.state().lookupError,'일시 오류');h.cleanup();
});

test('유효한 서버 비회원 응답은 이전 회원정보를 지운다',async()=>{
  let calls=0;const h=mount(async()=>++calls===1?member():guest);await tick();await h.retry();
  assert.equal(h.state().status,'guest');assert.equal(h.state().account,null);assert.deepEqual(h.state().profile,{});h.cleanup();
});

test('계정 전환은 이전 요청을 취소하고 이전 계정의 프로필을 즉시 지운다',async()=>{
  const old=deferred(),next=deferred();const signals=[];let calls=0;
  const h=mount(({signal})=>{signals.push(signal);return ++calls===1?Promise.resolve(member()):calls===2?old.promise:next.promise;});
  await tick();const stale=h.retry();
  h.event({signedIn:true,account:{role:'hospital'},identity:{email:'second@example.invalid'}});
  assert.equal(signals[1].aborted,true);assert.equal(h.state().role,'hospital');
  assert.deepEqual(h.state().registrationProfile,{});assert.deepEqual(h.state().hospitalProfile,{});
  next.resolve(member('second@example.invalid','hospital'));await tick();old.resolve(member());await stale;
  assert.equal(h.state().email,'second@example.invalid');assert.equal(h.state().role,'hospital');h.cleanup();
});

test('로그아웃 후 늦은 회원 응답이 도착해도 다시 회원으로 돌아가지 않는다',async()=>{
  const old=deferred();let calls=0;
  const h=mount(async()=>++calls===1?old.promise:guest);
  h.event({signedOut:true});await tick();old.resolve(member());await tick();
  assert.equal(h.state().status,'guest');assert.equal(h.state().email,'');h.cleanup();
});

test('화면 종료는 진행 중 요청을 중단하고 늦은 성공·실패 상태 갱신을 막는다',async()=>{
  for(const fail of [false,true]) {
    const pending=deferred();let signal;const h=mount(init=>{signal=init.signal;return pending.promise;});
    h.cleanup();const updates=h.updates();assert.equal(signal.aborted,true);
    if(fail)pending.reject(Error('늦은 오류'));else pending.resolve(member());await tick();
    assert.equal(h.updates(),updates);assert.equal(h.retry(),undefined);
  }
});

test('취소된 이전 요청의 오류가 새 계정 조회 오류로 표시되지 않는다',async()=>{
  const previous=deferred();let calls=0;
  const h=mount(()=>++calls===1?previous.promise:Promise.resolve(member('current@example.invalid')));
  h.event({signedIn:true,account:{role:'doctor'},identity:{email:'current@example.invalid'}});await tick();
  previous.reject(Error('과거 오류'));await tick();assert.equal(h.state().lookupError,'');assert.equal(h.state().email,'current@example.invalid');h.cleanup();
});

test('실제 조회 API의 본문 무응답도 훅에서 완료된 실패 상태로 전환된다',async()=>{
  let calls=0;
  const h=mount(options=>lookupAccount({...options,timeoutMs:10,fetchImpl:async()=>{calls++;return{ok:true,json:()=>new Promise(()=>{})};}}));
  await h.retry();assert.equal(h.state().lookupPending,false);assert.match(h.state().lookupError,/지연/);assert.equal(calls,1);h.cleanup();
});

test('초기 오류는 보호 화면의 무한 로딩 대신 오류·재시도 화면을 표시한다',()=>{
  assert.match(source,/function AccountLookupNotice/);
  assert.match(source,/onClick=\{auth.retryAccount\} disabled=\{auth.lookupPending\}/);
  assert.match(source,/lookupFailureBlocksPage = Boolean\(auth.lookupError\).*auth\.status === 'loading' && !publicPage/);
  assert.match(source,/if \(lookupFailureBlocksPage\) page = <AccountLookupNotice auth=\{auth\}/);
  assert.match(source,/\{accountLookupNotice\}<RouteBoundary>\{page\}<\/RouteBoundary>/);
  assert.match(source,/확인된 로그인 정보는 유지됩니다/);
});
