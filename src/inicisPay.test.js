import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inicisPaymentChannel,inicisMobileBrowserScheme,openInicisPayment} from './inicisPay.js';

test('iOS app-card return schemes are restricted to documented browser identities',()=>{
  for (const [ua,scheme] of [
    ['iPhone CriOS/143.0','googlechromes://'],
    ['iPhone NAVER(inapp; search; 1300)','naversearchapp://'],
    ['iPhone KAKAOTALK/26.0','kakaotalk://'],
    ['iPhone [FBAN/FBIOS;FBAV/500]','fb://'],
    ['iPhone DaumApps/6.0','daumapps://open'],
    ['iPhone Safari/604.1',''], ['Android NAVER(inapp)',''],
    ['Windows CriOS/143.0',''], ['iPhone EvilBrowser://host',''],
  ]) assert.equal(inicisMobileBrowserScheme({userAgent:ua}),scheme);
  assert.equal(inicisMobileBrowserScheme({userAgent:'Macintosh NAVER(inapp)',platform:'MacIntel',maxTouchPoints:5}),'naversearchapp://');
});

test('mobile app return preserves signed fields and server security options',async()=>{
  const previousDocument=globalThis.document, navDescriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  let posted;
  globalThis.document={createElement:()=>({children:[],style:{},appendChild(e){this.children.push(e);},submit(){posted=this;}}),body:{appendChild(){}}};
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{userAgent:'iPhone CriOS/143.0'}});
  try {
    const fields={P_CHKFAKE:'synthetic',P_NOTI:'signed-state',P_AMT:'29000',P_RESERVED:'centerCd=Y&amt_hash=Y'};
    const before=JSON.stringify(fields);
    await openInicisPayment({configured:true,mobile:true,returnUrl:'https://audit.local/api/payment-approve',action:'https://mobile.inicis.com/smart/payment/',fields});
    const sent=Object.fromEntries(posted.children.map(e=>[e.name,e.value]));
    assert.equal(sent.P_RESERVED,'centerCd=Y&amt_hash=Y&app_scheme=googlechromes://');
    for(const name of ['P_CHKFAKE','P_NOTI','P_AMT'])assert.equal(sent[name],fields[name]);
    assert.equal(JSON.stringify(fields),before);
  } finally {
    globalThis.document=previousDocument;
    if(navDescriptor)Object.defineProperty(globalThis,'navigator',navDescriptor);else delete globalThis.navigator;
  }
});
test('failed PC script load or missing SDK can be retried without retaining a rejected promise',async()=>{
 const originalDocument=globalThis.document,originalWindow=globalThis.window;
 const scripts=[];globalThis.window={};
 globalThis.document={createElement:()=>({remove(){this.removed=true;}}),head:{appendChild(s){scripts.push(s);}}};
 try {
  const {loadInicisScript}=await import('./inicisPay.js?retry-test');
  const first=loadInicisScript();scripts[0].onload();
  await assert.rejects(first,/불러오지/);assert.equal(scripts[0].removed,true);
  const second=loadInicisScript();assert.equal(scripts.length,2);scripts[1].onerror();
  await assert.rejects(second,/불러오지/);assert.equal(scripts[1].removed,true);
  const third=loadInicisScript();assert.equal(scripts.length,3);const sdk={pay(){}};globalThis.window.INIStdPay=sdk;scripts[2].onload();
  assert.equal(await third,sdk);assert.equal(await loadInicisScript(),sdk);assert.equal(scripts.length,3);
 } finally {globalThis.document=originalDocument;globalThis.window=originalWindow;}
});

test('PC 결제 모듈 무응답은 제한 시간 후 끝나며 늦은 이벤트가 재시도를 방해하지 않는다',async()=>{
 const originalDocument=globalThis.document,originalWindow=globalThis.window;
 const scripts=[];globalThis.window={};
 globalThis.document={createElement:()=>({remove(){this.removed=true;}}),head:{appendChild(s){scripts.push(s);}}};
 try {
  const {loadInicisScript}=await import('./inicisPay.js?timeout-test');
  const first=loadInicisScript(true,{timeoutMs:5});
  assert.equal(loadInicisScript(),first);
  const lateLoad=scripts[0].onload;
  await assert.rejects(first,/응답이 지연/);assert.equal(scripts[0].removed,true);
  assert.equal(scripts[0].onload,null);assert.equal(scripts[0].onerror,null);
  const second=loadInicisScript();
  lateLoad();
  assert.equal(loadInicisScript(),second);
  const sdk={pay(){}};window.INIStdPay=sdk;scripts[1].onload();
  assert.equal(await second,sdk);assert.equal(scripts.length,2);
 } finally {globalThis.document=originalDocument;globalThis.window=originalWindow;}
});

test('불완전한 SDK와 스크립트 삽입 실패 뒤에도 정상 결제 모듈을 다시 불러온다',async()=>{
 const originalDocument=globalThis.document,originalWindow=globalThis.window;
 const scripts=[];let fail=true;globalThis.window={INIStdPay:{}};
 globalThis.document={createElement:()=>({remove(){}}),head:{appendChild(s){if(fail)throw Error('blocked');scripts.push(s);}}};
 try {
  const {loadInicisScript}=await import('./inicisPay.js?incomplete-test');
  await assert.rejects(loadInicisScript(),/불러오지/);
  fail=false;
  const second=loadInicisScript();scripts[0].onload();
  await assert.rejects(second,/불러오지/);
  const third=loadInicisScript();window.INIStdPay={pay(){}};scripts[1].onload();
  assert.equal(typeof (await third).pay,'function');
 } finally {globalThis.document=originalDocument;globalThis.window=originalWindow;}
});
test('payment device detection supports mobile and desktop-mode iPad',()=>{
 for(const nav of [{userAgent:'iPhone'},{userAgent:'Android Mobile'},{userAgent:'Macintosh Safari',platform:'MacIntel',maxTouchPoints:5}])assert.equal(inicisPaymentChannel(nav),'mobile');
 for(const nav of [{userAgent:'Windows Chrome'},{userAgent:'Macintosh',platform:'MacIntel',maxTouchPoints:0},undefined])assert.equal(inicisPaymentChannel(nav),'pc');
});
test('closing and reopening PC payment invokes only the current close handler',async()=>{
 const oldDocument=globalThis.document,oldWindow=globalThis.window;
 let originalCalls=0,firstClosed=0,secondClosed=0;
 const sdk={viewOff(){originalCalls++;},pay(){}};
 globalThis.window={INIStdPay:sdk};
 globalThis.document={getElementById(){return null;},createElement:()=>({style:{},appendChild(){}}),body:{appendChild(){}}};
 try {
  const {openInicisPayment:open}=await import('./inicisPay.js?close-test');
  const params={configured:true,returnUrl:'https://audit.local/api/payment-approve'};
  await open(params,{}, {onClose:()=>firstClosed++});sdk.viewOff();sdk.viewOff();
  assert.equal(firstClosed,1);assert.equal(originalCalls,2);
  await open(params,{}, {onClose:()=>secondClosed++});sdk.viewOff();
  assert.equal(firstClosed,1);assert.equal(secondClosed,1);assert.equal(originalCalls,3);
 } finally {globalThis.document=oldDocument;globalThis.window=oldWindow;}
});
test('mobile checkout posts hidden fields to exact provider without PC script',async()=>{
 const original=globalThis.document;let posted=null;
 globalThis.document={createElement:tag=>({tag,children:[],style:{},appendChild(e){this.children.push(e);},submit(){posted=this;}}),body:{appendChild(){}},head:{appendChild(){throw Error('PC script should not load');}}};
 try {
  const p={configured:true,mobile:true,returnUrl:'https://audit.local/api/payment-approve',action:'https://mobile.inicis.com/smart/payment/',fields:{P_CHKFAKE:'synthetic',P_AMT:'59000',P_GOODS:'<테스트>'}};
  await openInicisPayment(p);assert.equal(posted.method,'POST');assert.equal(posted.target,'_self');assert.equal(posted.acceptCharset,'euc-kr');assert.equal(posted.children.find(e=>e.name==='P_GOODS').value,'<테스트>');
  posted=null;await assert.rejects(openInicisPayment({...p,action:'https://evil.test/'}));assert.equal(posted,null);
 } finally {globalThis.document=original;}
});
