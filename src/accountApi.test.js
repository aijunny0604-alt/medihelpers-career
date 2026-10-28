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

test('로그아웃은 서버의 명시적인 세션 종료 응답만 성공으로 처리한다', async () => {
  for (const payload of [{}, {signedOut:false}, {signedOut:'true'}, {signedOut:'false'}]) {
    await assert.rejects(authRequest('logout', {}, {fetchImpl:async () => Response.json(payload)}), /로그아웃 완료 응답/);
  }
  await assert.rejects(authRequest('logout', {}, {fetchImpl:async () => {throw new TypeError('offline');}}), /서버에 연결하지 못했습니다/);
  const result = await authRequest('logout', {}, {fetchImpl:async () => Response.json({signedOut:true})});
  assert.equal(result.signedOut, true);
});

const registration = { role:'doctor', loginId:'synthetic-only', email:'synthetic@example.invalid' };
const registered = { signedIn:true, account:{role:'doctor'}, identity:{email:registration.email,loginId:registration.loginId} };

test('가입은 요청한 회원 유형·이메일·아이디와 일치하는 응답만 인정한다', async () => {
  for (const payload of [
    {signedIn:true}, {...registered,error:'가입 실패'}, {...registered,account:{role:'hospital'}},
    {...registered,identity:{email:'other@example.invalid'}}, {...registered,identity:{email:registration.email,loginId:'other-id'}}
  ]) await assert.rejects(authRequest('register',registration,{fetchImpl:async()=>Response.json(payload)}), /가입 완료 응답/);
  const result = await authRequest('register', {...registration,email:' Synthetic@Example.Invalid ',loginId:' synthetic-only '}, {fetchImpl:async()=>Response.json(registered)});
  assert.equal(result.account.role,'doctor');
});

test('병원 multipart의 파일 원본은 그대로 보내며 payload에 맞는 가입 응답을 검증한다', async () => {
  const body = new FormData();
  body.append('payload',JSON.stringify({...registration,role:'hospital'}));
  body.append('businessDocument',new File(['%PDF-synthetic'],'synthetic.pdf',{type:'application/pdf'}));
  await authRequest('register',body,{fetchImpl:async(_,init)=>{
    assert.equal(init.body,body);
    assert.equal(await init.body.get('businessDocument').text(),'%PDF-synthetic');
    assert.equal(init.headers['content-type'],undefined);
    return Response.json({...registered,account:{role:'hospital'}});
  }});
});

test('취소된 가입 요청은 보내지 않으며 이미 가입됐을 가능성을 안내한다', async () => {
  const controller=new AbortController();controller.abort();let calls=0;
  await assert.rejects(authRequest('register',registration,{signal:controller.signal,fetchImpl:async()=>{calls++;return Response.json(registered);}}),error=>error.name==='AbortError'&&/가입이 완료되었을 수 있으니/.test(error.message));
  assert.equal(calls,0);
});

test('가입 응답 본문 대기 중 취소하면 늦은 응답은 세션을 저장하거나 통지하지 않는다', async () => {
  const previousWindow=globalThis.window,previousEvent=globalThis.CustomEvent;
  const events=[],storage=[];
  globalThis.window={dispatchEvent:event=>events.push(event),sessionStorage:{setItem:(...args)=>storage.push(args),removeItem(){}}};
  globalThis.CustomEvent=class {constructor(type,options){this.type=type;this.detail=options.detail;}};
  try {
    const controller=new AbortController();let finish,bodyStarted,requestSignal;
    const started=new Promise(resolve=>bodyStarted=resolve);
    const pending=authRequest('register',registration,{signal:controller.signal,fetchImpl:async(_,init)=>{
      requestSignal=init.signal;return{ok:true,json:()=>{bodyStarted();return new Promise(resolve=>finish=resolve);}};
    }});
    await started;controller.abort();await assert.rejects(pending,{name:'AbortError'});
    finish({...registered,sessionToken:'a'.repeat(64)});for(let i=0;i<8;i++)await Promise.resolve();
    assert.equal(requestSignal.aborted,true);assert.deepEqual(events,[]);assert.deepEqual(storage,[]);
  } finally {globalThis.window=previousWindow;globalThis.CustomEvent=previousEvent;}
});

test('가입 폼은 정상 인증 통지를 완료 이동과 함께 진행하도록 늦출 수 있다', async () => {
  const previousWindow=globalThis.window,previousEvent=globalThis.CustomEvent;const events=[];
  globalThis.window={dispatchEvent:event=>events.push(event)};globalThis.CustomEvent=class {constructor(type,options){this.type=type;this.detail=options.detail;}};
  try {
    await authRequest('register',registration,{notifyAuthChange:false,fetchImpl:async()=>Response.json(registered)});
    assert.equal(events.length,0);
    await authRequest('login',{}, {fetchImpl:async()=>Response.json({signedIn:true})});
    assert.equal(events.length,1);assert.equal(events[0].detail.action,'login');
  } finally {globalThis.window=previousWindow;globalThis.CustomEvent=previousEvent;}
});
