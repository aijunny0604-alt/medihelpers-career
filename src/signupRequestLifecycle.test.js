import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as fields from './signupFields.js';
import {authRequest} from './accountApi.js';
import {normalizeWebsiteUrl} from './websiteUrl.js';

const source=readFileSync(new URL('./AccountPage.jsx',import.meta.url),'utf8');
const code=source.slice(source.indexOf('function SignupApplicationForm('),source.indexOf('  const consentError = submittedOnce'))+
 'return {submit,setField,toggleConsent,toggleAllConsents,chooseBusinessDocument,removeBusinessDocument,toggleHospitalDocumentConsent,toggleOptionalPrivacyConsent,setDraft,draft,errors,submitting,businessDocument,optionalPrivacyConsent,hospitalDocumentConsent};} globalThis.render=SignupApplicationForm;';
const ready={...fields.createEmptyDraft('doctor'),name:'합성 검수',phone:'010-0000-0000',loginId:'synthetic-only',email:'synthetic@example.invalid',password:'QaPassword123!',passwordConfirm:'QaPassword123!',professionType:'의사',region:'서울',termsAccepted:true,privacyAccepted:true,ageConfirmed:true,hospitalName:'합성 병원',representativeName:'합성 대표',businessNumber:'123-45-67890',address:'서울 합성 주소 123',specialty:'선택 분야',hospitalRole:'선택 직책',department:'선택 부서',addressDetail:'선택 상세주소',website:'https://example.invalid'};
const file=new File(['%PDF-synthetic-one'],'one.pdf',{type:'application/pdf'});
const event={preventDefault(){}};
const registered=role=>({signedIn:true,account:{role},identity:{email:ready.email,loginId:ready.loginId}});

function setup(fetchImpl,{memberType='doctor',unmountOnPublish=false}={}){
 const cells=[],effects=[];let cursor=0;const log={requests:[],completions:[],authEvents:[]};
 const ctx={...fields,normalizeWebsiteUrl,PRIVACY_FORM_VERSION:'synthetic',FormData,AbortController,
  useState:initial=>{const i=cursor++;if(!(i in cells))cells[i]=typeof initial==='function'?initial():initial;return[cells[i],v=>cells[i]=typeof v==='function'?v(cells[i]):v];},
  useRef:value=>{const i=cursor++;return cells[i]||={current:value};},useMemo:fn=>fn(),
  useEffect:(fn,deps)=>{const i=cursor++;if(!cells[i]){cells[i]={};effects.push(()=>cells[i].cleanup=fn());}},
  roleContent:{doctor:{icon(){}},hospital:{icon(){}}},FIELD_META:{phone:{phone:true}},document:{getElementById:()=>null},revealAndFocusField(){},
  authRequest:(action,body,options)=>authRequest(action,body,{...options,timeoutMs:10,fetchImpl:async(path,init)=>{log.requests.push({path,init});return fetchImpl(path,init);}}),
  publishAuthChange:(action,result)=>{log.authEvents.push({action,result});if(unmountOnPublish)unmount();},
  accountRequest:async()=>{throw new Error('미사용 경로');}};
 vm.createContext(ctx);vm.runInContext(code,ctx);
 const render=()=>{cursor=0;const page=ctx.render({memberType,signedIn:false,onComplete:(...args)=>log.completions.push(args)});effects.splice(0).forEach(fn=>fn());return page;};
 const unmount=()=>cells.forEach(cell=>cell?.cleanup?.());
 let page=render();page.setDraft({...ready,role:memberType});
 if(memberType==='hospital'){page.chooseBusinessDocument(file);page.toggleHospitalDocumentConsent(true);}
 return{render,unmount,log};
}

for(const role of ['doctor','hospital'])test(`${role}: 선택 동의 없이 필수 정보로 가입하고 미동의 정보·원본 파일을 올바르게 처리한다`,async()=>{
 const h=setup(async()=>Response.json(registered(role)),{memberType:role,unmountOnPublish:true});await h.render().submit(event);
 const body=h.log.requests[0].init.body,payload=typeof body==='string'?JSON.parse(body):JSON.parse(body.get('payload'));
 assert.equal(payload.optionalPrivacyConsent,false);for(const key of ['specialty','hospitalRole','department','addressDetail','website'])assert.equal(payload[key],'');
 if(role==='hospital')assert.equal(await body.get('businessDocument').text(),await file.text());
 assert.equal(h.log.authEvents.length,1);assert.equal(h.log.completions.length,1);assert.equal(h.render().draft.loginId,'');
});

for(const scenario of ['http-failure','http200-failure','broken-json','header-stall','body-stall','wrong-account'])test(`병원 가입 ${scenario}: 완료하지 않고 입력·파일·동의를 보존한다`,async()=>{
 const h=setup(async()=>{
  if(scenario==='header-stall')return new Promise(()=>{});
  if(scenario==='body-stall')return{ok:true,json:()=>new Promise(()=>{})};
  if(scenario==='broken-json')return new Response('{broken',{headers:{'content-type':'application/json'}});
  if(scenario==='wrong-account')return Response.json(registered('doctor'));
  return Response.json({error:'합성 실패',signedIn:false},{status:scenario==='http-failure'?503:200});
 },{memberType:'hospital'});await h.render().submit(event);const p=h.render();
 assert.equal(h.log.completions.length,0);assert.equal(h.log.authEvents.length,0);assert.equal(p.draft.loginId,ready.loginId);assert.equal(p.businessDocument,file);assert.equal(p.hospitalDocumentConsent,true);assert.equal(p.submitting,false);assert.ok(p.errors.submit);
});

test('가입 전송 중 중복 클릭·아이디 변경·서류 교체/삭제·필수/선택 동의 변경을 막는다',async()=>{
 let finish;const h=setup(()=>new Promise(resolve=>finish=()=>resolve(Response.json(registered('hospital')))),{memberType:'hospital'});
 h.render().toggleOptionalPrivacyConsent(true);const p=h.render(),pending=p.submit(event);await p.submit(event);
 p.setField('loginId','changed');p.chooseBusinessDocument(new File(['new'],'new.pdf',{type:'application/pdf'}));p.removeBusinessDocument();p.toggleOptionalPrivacyConsent(false);p.toggleHospitalDocumentConsent(false);p.toggleConsent('termsAccepted',false);p.toggleAllConsents(false);
 const during=h.render();assert.equal(h.log.requests.length,1);assert.equal(during.draft.loginId,ready.loginId);assert.equal(during.businessDocument,file);assert.equal(during.optionalPrivacyConsent,true);assert.equal(during.hospitalDocumentConsent,true);assert.equal(during.draft.termsAccepted,true);
 finish();await pending;assert.equal(h.log.completions.length,1);assert.equal(h.render().submitting,false);
 assert.match(source,/<fieldset disabled=\{submitting\} style=\{\{ border:0, padding:0, margin:0, minWidth:0 \}\}>/);
});

test('가입 대기 중 화면을 떠나면 늦은 완료가 현재 화면을 이동시키거나 인증 통지하지 않는다',async()=>{
 let finish;const h=setup(()=>new Promise(resolve=>finish=()=>resolve(Response.json(registered('doctor')))));
 const pending=h.render().submit(event);h.unmount();await pending;finish();for(let i=0;i<10;i++)await Promise.resolve();
 assert.equal(h.log.requests[0].init.signal.aborted,true);assert.equal(h.log.completions.length,0);assert.equal(h.log.authEvents.length,0);assert.equal(h.render().draft.loginId,ready.loginId);
 assert.match(source,/<SignupApplicationForm key=\{memberType\}/);
});

test('가입 실패 뒤 서류를 교체하고 같은 입력으로 직접 재시도할 수 있다',async()=>{
 let attempts=0;const h=setup(async()=>++attempts===1?Response.json({error:'합성 실패'},{status:503}):Response.json(registered('hospital')),{memberType:'hospital'});
 await h.render().submit(event);const replacement=new File(['%PDF-replacement'],'replacement.pdf',{type:'application/pdf'});h.render().chooseBusinessDocument(replacement);await h.render().submit(event);
 assert.equal(attempts,2);assert.equal(h.log.completions.length,1);assert.equal(h.log.requests[1].init.body.get('businessDocument'),replacement);
});
