import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isConfirmedPayment,postPayment} from './paymentApi.js';

const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const extract=(file,pattern)=>readFileSync(new URL(file,import.meta.url),'utf8').replaceAll('\r\n','\n').match(pattern)[1];
const bind=(body,deps)=>new AsyncFunction(...Object.keys(deps),body).bind(null,...Object.values(deps));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const retryBody=extract('./PaymentRecoveryPanel.jsx',/const retry = async \(\) => \{([\s\S]*?)\n  \};\n  if/);
const resumeBody=extract('./PaymentRecoveryPanel.jsx',/const resume = async \(\) => \{([\s\S]*?)\n  \};\n  const retry/);
const renewBody=extract('./RenewAdButton.jsx',/async function renew\(\) \{([\s\S]*?)\n  \}\n  if\(order/);
const retrySetup=(post,extras={})=>{
  const errors=[],completed=[],busy=[];
  const deps={inFlight:{current:false},mounted:{current:true},isConfirmedPayment,setBusy:x=>busy.push(x),setError:x=>errors.push(x),
    order:{orderNumber:'SYNTHETIC-ORDER'},postPayment:post,onRecovered:x=>completed.push(x),...extras};
  return{run:bind(retryBody,deps),deps,errors,completed,busy};
};

for(const [name,result] of [
  ['문자열 false',{approved:'false',status:'paid',orderNumber:'SYNTHETIC-ORDER'}],
  ['다른 주문',{approved:true,status:'paid',orderNumber:'OTHER'}],
  ['미결제 상태',{approved:true,status:'pending_review',orderNumber:'SYNTHETIC-ORDER'}],
]) test(`재확인 UI는 ${name} 응답을 완료로 넘기지 않는다`,async()=>{
  const h=retrySetup(async()=>({response:{ok:true},result}));await h.run();
  assert.equal(h.completed.length,0);assert.ok(h.errors.filter(Boolean).length);assert.equal(h.busy.at(-1),false);
});
test('재확인 UI는 지연 중 중복 제출을 차단하고 승인 콜백까지 기다린다',async()=>{
  const response=deferred(),callback=deferred();let posts=0;
  const h=retrySetup(()=>{posts++;return response.promise;},{onRecovered:()=>callback.promise});
  const first=h.run();await h.run();assert.equal(posts,1);
  response.resolve({response:{ok:true},result:{approved:true,status:'paid',orderNumber:'SYNTHETIC-ORDER'}});
  await tick();assert.equal(h.deps.inFlight.current,true);callback.resolve();await first;
  assert.equal(h.deps.inFlight.current,false);
});
test('결과 확인 도중 화면을 벗어나면 늦은 성공을 다음 화면에 전달하지 않는다',async()=>{
  const response=deferred();const h=retrySetup(()=>response.promise);const first=h.run();
  h.deps.mounted.current=false;response.resolve({response:{ok:true},result:{approved:true,status:'paid',orderNumber:'SYNTHETIC-ORDER'}});await first;
  assert.equal(h.completed.length,0);
});
test('재개 요청 중 화면을 벗어나면 뒤늦게 결제창을 열지 않는다',async()=>{
  const response=deferred(),mounted={current:true};let opened=0;
  const run=bind(resumeBody,{inFlight:{current:false},mounted,setBusy:()=>{},setError:()=>{},
    postPayment:()=>response.promise,order:{orderNumber:'SYNTHETIC-ORDER'},PRIVACY_FORM_VERSION:'test',
    openInicisPayment:async()=>opened++,retry:async()=>{}});
  const first=run();mounted.current=false;response.resolve({response:{ok:true},result:{order:{orderNumber:'SYNTHETIC-ORDER'},inicis:{configured:true}}});await first;
  assert.equal(opened,0);
});

const renewSetup=(post,extras={})=>{
 const orders=[],remembered=[],errors=[],busy=[],completed=[];
 const deps={inFlight:{current:false},mounted:{current:true},isConfirmedPayment,confirmAction:async()=>true,
  ad:{title:'합성 공고',plan:'기본',contentRecordId:'SYNTHETIC-CONTENT',productId:'basic'},
  setBusy:x=>busy.push(x),setError:x=>errors.push(x),setOrder:x=>orders.push(x),
  rememberOrder:x=>remembered.push(x),
  PRIVACY_FORM_VERSION:'test',inicisPaymentChannel:()=> 'pc',postPayment:post,
  openInicisPayment:async()=>{},completed:()=>completed.push(true),...extras};
 return{run:bind(renewBody,deps),deps,orders,remembered,errors,busy,completed};
};
test('재구매는 동의창이 열린 순간부터 중복 실행을 차단한다',async()=>{
 const consent=deferred();let confirms=0,posts=0;
 const h=renewSetup(async()=>{posts++;},{confirmAction:()=>{confirms++;return consent.promise;}});
 const first=h.run();await h.run();assert.equal(confirms,1);consent.resolve(false);await first;
 assert.equal(posts,0);assert.equal(h.busy.at(-1),false);assert.equal(h.deps.inFlight.current,false);
});
for(const bodyStalls of [false,true]) test(`재구매 ${bodyStalls?'본문':'헤더'} 무응답은 같은 주문 확인으로 안내한다`,async()=>{
 let requests=0,signal;
 const h=renewSetup((path,body)=>postPayment(path,body,{timeoutMs:5,fetchImpl:async(_,init)=>{
  requests++;signal=init.signal;return bodyStalls?{ok:true,json:()=>new Promise(()=>{})}:new Promise(()=>{});
 }}));
 await h.run();assert.equal(requests,1);assert.equal(signal.aborted,true);
 assert.deepEqual(h.orders,[{}]);assert.equal(h.completed.length,0);assert.equal(h.busy.at(-1),false);
});
test('재구매 연결 단절은 주문 생성 여부를 단정하지 않고 복구 패널로 연결한다',async()=>{
 const h=renewSetup((path,body)=>postPayment(path,body,{fetchImpl:async()=>{throw Error('offline');}}));
 await h.run();assert.deepEqual(h.orders,[{}]);assert.equal(h.completed.length,0);
});
test('재구매 세션 만료는 새 주문·완료 없이 오류를 표시하고 잠금을 푼다',async()=>{
 const h=renewSetup(async()=>({response:{ok:false,status:401},result:{error:'로그인이 만료되었습니다.'}}));
 await h.run();assert.deepEqual(h.orders,[]);assert.equal(h.completed.length,0);assert.match(h.errors.at(-1),/만료/);assert.equal(h.busy.at(-1),false);
});
test('이미 저장된 재구매 주문은 승인 실패에도 같은 번호를 유지한다',async()=>{
 let requests=0;const order={orderNumber:'SYNTHETIC-ORDER'};
 const h=renewSetup(async()=>++requests===1?{response:{ok:true},result:{order}}:{response:{ok:false},result:{error:'승인 확인 실패'}});
 await h.run();assert.deepEqual(h.orders,[order]);assert.deepEqual(h.remembered,[order]);assert.equal(h.completed.length,0);
});
test('재구매 진행 중 화면을 벗어나면 늦은 응답으로 PG창이나 완료 화면을 열지 않는다',async()=>{
 const response=deferred();let opened=0;
 const h=renewSetup(()=>response.promise,{openInicisPayment:async()=>opened++});const first=h.run();await tick();
 h.deps.mounted.current=false;response.resolve({response:{ok:true},result:{order:{orderNumber:'SYNTHETIC-ORDER'},inicis:{configured:true}}});await first;
 assert.equal(opened,0);assert.equal(h.completed.length,0);assert.equal(h.orders.length,0);
 assert.deepEqual(h.remembered,[{orderNumber:'SYNTHETIC-ORDER'}]);
});

test('재구매 SDK 준비와 열린 결제창에서는 복구 버튼을 노출하지 않고 실제 pay를 한 번만 호출한다',async()=>{
 const originalWindow=globalThis.window,originalDocument=globalThis.document;
 const scripts=[];let pays=0,posts=0;
 globalThis.window={};
 globalThis.document={getElementById:()=>null,createElement:()=>({style:{},appendChild(){},remove(){}}),
  head:{appendChild:script=>scripts.push(script)},body:{appendChild(){}}};
 try {
  const {openInicisPayment}=await import('./inicisPay.js?renewal-single-launch');
  const order={orderNumber:'SYNTHETIC-ORDER'};
  const h=renewSetup(async()=>{posts++;return{response:{ok:true},result:{order,inicis:{configured:true,returnUrl:'https://synthetic.invalid/return'}}};},{openInicisPayment});
  const first=h.run();await tick();
  assert.equal(scripts.length,1);assert.equal(h.orders.length,0);assert.deepEqual(h.remembered,[order]);
  assert.equal(h.busy.at(-1),true);await h.run();assert.equal(posts,1);
  window.INIStdPay={pay(){pays++;},viewOff(){}};scripts[0].onload();await first;
  await h.run();assert.equal(pays,1);assert.equal(posts,1);assert.equal(h.orders.length,0);assert.equal(h.busy.at(-1),true);
  window.INIStdPay.viewOff();assert.deepEqual(h.orders,[order]);assert.equal(h.busy.at(-1),false);assert.equal(h.deps.inFlight.current,false);
  window.INIStdPay.viewOff();assert.deepEqual(h.orders,[order]);
 } finally {globalThis.window=originalWindow;globalThis.document=originalDocument;}
});

test('재구매 SDK 실패는 저장된 같은 주문을 복구 화면에 전달한다',async()=>{
 const order={orderNumber:'SYNTHETIC-ORDER'};
 const h=renewSetup(async()=>({response:{ok:true},result:{order,inicis:{configured:true}}}),{openInicisPayment:async()=>{throw Error('SDK 실패');}});
 await h.run();assert.deepEqual(h.remembered,[order]);assert.deepEqual(h.orders,[order]);assert.equal(h.busy.at(-1),false);
});

test('재구매 승인 대기 중 화면 이탈 후 확정 승인은 보관 번호만 정리한다',async()=>{
 const response=deferred();let calls=0;
 const h=renewSetup(async()=>++calls===1?{response:{ok:true},result:{order:{orderNumber:'SYNTHETIC-ORDER'}}}:response.promise);
 const first=h.run();await tick();h.deps.mounted.current=false;
 response.resolve({response:{ok:true},result:{approved:true,status:'paid',orderNumber:'SYNTHETIC-ORDER'}});await first;
 assert.deepEqual(h.remembered,[{orderNumber:'SYNTHETIC-ORDER'},null]);assert.equal(h.completed.length,0);assert.equal(h.orders.length,0);
});
