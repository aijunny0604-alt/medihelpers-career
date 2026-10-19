import test from 'node:test';
import assert from 'node:assert/strict';
import { authRequest } from './accountApi.js';

test('로그인 요청과 응답 본문 모두 제한 시간 안에 완료되어야 한다', async () => {
  let signal;
  await assert.rejects(authRequest('login', {}, {timeoutMs:10, fetchImpl:async (_, init) => {
    signal=init.signal; return new Promise(()=>{});
  }}), /응답이 지연/);
  assert.equal(signal.aborted,true);
  await assert.rejects(authRequest('login', {}, {timeoutMs:10, fetchImpl:async () => ({ok:true,json:()=>new Promise(()=>{})})}), /응답이 지연/);
});

test('가입 시간 초과는 자동 재가입하지 않고 로그인 확인을 안내한다', async () => {
  let calls=0;
  await assert.rejects(authRequest('register', {}, {timeoutMs:10,fetchImpl:async()=>{calls++;return new Promise(()=>{});}}), /가입이 완료되었을 수 있으니/);
  assert.equal(calls,1);
});

test('잘못된 응답을 로그인 성공으로 취급하지 않는다', async () => {
  for(const payload of [null,[],{},'html']) {
    await assert.rejects(authRequest('login',{}, {fetchImpl:async()=>Response.json(payload)}), /응답을 확인하지 못했습니다/);
  }
  await assert.rejects(authRequest('login',{}, {fetchImpl:async()=>Response.json({error:'비밀번호 확인'}, {status:401})}), /비밀번호 확인/);
  const result=await authRequest('login',{}, {fetchImpl:async()=>Response.json({signedIn:true,account:{role:'doctor'}})});
  assert.equal(result.account.role,'doctor');
});
