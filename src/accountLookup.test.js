import test from 'node:test';
import assert from 'node:assert/strict';
import { lookupAccount, validAccountLookup } from './accountLookup.js';

const member={signedIn:true,isAdmin:false,account:{role:'doctor'},identity:{email:'qa@example.invalid'}};
const guest={signedIn:false,account:null,identity:{},isAdmin:false,signupEnabled:true};
const response=value=>Response.json(value);

test('회원·비회원·인증된 기존 원장 미등록 응답의 계약을 수용한다',async()=>{
  for(const value of [member,guest,{signedIn:false,signupEnabled:true},{...member,account:null},{...member,isAdmin:true}]) {
    assert.equal(validAccountLookup(value),true);
    assert.deepEqual(await lookupAccount({fetchImpl:async(url,init)=>{
      assert.equal(url,'/api/account');assert.equal(init.cache,'no-store');assert.equal(init.credentials,'same-origin');
      assert.ok(init.signal);return response(value);
    }}),value);
  }
});

for(const [name,value] of [
  ['빈 객체',{}],['배열',[]],['null',null],['문자열 로그인',{signedIn:'false'}],
  ['역할만 있는 응답',{account:{role:'hospital'}}],['잘못된 역할',{...member,account:{role:'unknown'}}],
  ['문자열 관리자',{...member,isAdmin:'false'}],['잘못된 프로필',{...member,profile:[]}],
  ['비회원 관리자',{...guest,isAdmin:true}],['비회원의 회원 원장',{...guest,account:{role:'doctor'}}],
  ['회원 식별자 누락',{...member,identity:{}}],['문자열 회원가입 설정',{...guest,signupEnabled:'true'}],
]) test(`${name}은 로그인 상태 확인 완료로 처리하지 않는다`,async()=>{
  assert.equal(validAccountLookup(value),false);
  await assert.rejects(lookupAccount({fetchImpl:async()=>response(value)}),{code:'ACCOUNT_LOOKUP_INVALID'});
});

test('로그인 조회는 fetch 무응답도 시간 제한 후 중단한다',async()=>{
  let signal,calls=0;
  await assert.rejects(lookupAccount({timeoutMs:10,fetchImpl:(_url,init)=>{
    calls++;signal=init.signal;return new Promise(()=>{});
  }}),{code:'ACCOUNT_LOOKUP_TIMEOUT'});
  assert.equal(signal.aborted,true);assert.equal(calls,1);
});

test('로그인 조회는 응답 본문 무응답에도 동일한 시간 제한을 적용한다',async()=>{
  let signal;
  await assert.rejects(lookupAccount({timeoutMs:10,fetchImpl:async(_url,init)=>{
    signal=init.signal;return {ok:true,json:()=>new Promise(()=>{})};
  }}),{code:'ACCOUNT_LOOKUP_TIMEOUT'});
  assert.equal(signal.aborted,true);
});

test('외부 취소는 fetch가 abort를 무시해도 대기를 끝낸다',async()=>{
  const controller=new AbortController();let signal;
  const pending=lookupAccount({signal:controller.signal,fetchImpl:async(_url,init)=>{
    signal=init.signal;return new Promise(()=>{});
  }});
  controller.abort();await assert.rejects(pending,{name:'AbortError'});assert.equal(signal.aborted,true);
});

test('이미 취소된 조회는 요청하지 않는다',async()=>{
  const controller=new AbortController();controller.abort();let called=false;
  await assert.rejects(lookupAccount({signal:controller.signal,fetchImpl:async()=>{called=true;}}),{name:'AbortError'});
  assert.equal(called,false);
});

test('본문 읽는 중 취소해도 늦은 본문은 조회 성공으로 돌아오지 않는다',async()=>{
  const controller=new AbortController();let complete;
  const pending=lookupAccount({signal:controller.signal,fetchImpl:async()=>({ok:true,json:()=>new Promise(resolve=>{complete=resolve;})})});
  await Promise.resolve();await Promise.resolve();controller.abort();await assert.rejects(pending,{name:'AbortError'});
  complete(member);
});

test('연결·HTTP·JSON 실패는 원문이나 잘못된 로그아웃 신호를 노출하지 않는다',async()=>{
  for(const fetchImpl of [
    async()=>{throw Error('private server detail');},
    async()=>Response.json({signedIn:false,error:'private server detail'}, {status:503}),
    async()=>new Response('private server detail',{status:503}),
    async()=>({ok:true,json:async()=>{throw Error('private server detail');}}),
  ]) {
    await assert.rejects(lookupAccount({fetchImpl}),error=>!error.message.includes('private'));
  }
  await assert.rejects(lookupAccount({fetchImpl:async()=>new Response('secret',{status:503})}),{code:'ACCOUNT_LOOKUP_UNAVAILABLE'});
  await assert.rejects(lookupAccount({fetchImpl:async()=>({ok:true,json:async()=>{throw SyntaxError('secret');}})}),{code:'ACCOUNT_LOOKUP_INVALID'});
});

test('성공·실패·취소 이후 외부 abort 구독을 제거한다',async()=>{
  for(const mode of ['success','failure','cancel']) {
    const controller=new AbortController();let added=0,removed=0;
    const add=controller.signal.addEventListener.bind(controller.signal),remove=controller.signal.removeEventListener.bind(controller.signal);
    controller.signal.addEventListener=(...args)=>{added++;add(...args);};
    controller.signal.removeEventListener=(...args)=>{removed++;remove(...args);};
    const pending=lookupAccount({signal:controller.signal,fetchImpl:async()=>mode==='cancel'?new Promise(()=>{}):mode==='success'?response(guest):response({})});
    if(mode==='cancel')controller.abort();
    await pending.catch(()=>{});assert.equal(added,1);assert.equal(removed,1);
  }
});
