import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {saveResume} from './resumeApi.js';
import {uploadResumePhoto,validateResumePhoto} from './resumePhotoUpload.js';
const source=readFileSync(new URL('./ResumePage.jsx',import.meta.url),'utf8');
const code=source.slice(source.indexOf('const PROFESSION_OPTIONS'),source.indexOf('export default function ResumePage'))+
 source.slice(source.indexOf('function ResumeEditor'),source.indexOf('  if (completed) return'))+'return {submit,choosePhotoFile,removePhoto,update,setForm,form,completed,submitting,submitError,needsLogin,savedResumeId,setSavedResumeId,photoFile};} globalThis.render=ResumeEditor;';
const ownerCode=source.slice(source.indexOf('export default function ResumePage'),source.indexOf('function ResumeEditor')).replace('export default ','').replace('return <ResumeEditor key={ownerKey} auth={auth} />;','return ownerKey;')+'globalThis.ownerKey=ResumePage;';
const ready={title:'합성 A 이력서',profession:'의사',name:'합성 A',phone:'00000000000',email:'qa-a@example.invalid',introduction:'합성 A 경력',consent:true,photoUrl:'',desiredRegions:'합성 지역'};
const file={type:'image/png',size:12};const photoUrl='/api/uploads/profiles/QA/resume-profile/PHOTO.png';
const ticks=async()=>{for(let i=0;i<15;i++)await Promise.resolve();};
function setup(fetchImpl,auth={email:'qa-a@example.invalid',name:'합성 A',status:'member',role:'doctor'}){
 const cells=[],effects=[];let cursor=0;const calls=[];
 const fetcher=async(path,init)=>{calls.push({path,...init});return fetchImpl(path,init);};
 const ctx={useState:initial=>{let i=cursor++;if(!(i in cells))cells[i]=initial;return[cells[i],v=>cells[i]=typeof v==='function'?v(cells[i]):v];},useRef:v=>{let i=cursor++;return cells[i]||={current:v};},useMemo:fn=>fn(),
  useEffect:(fn,deps)=>{let i=cursor++;let old=cells[i];if(!old||deps.some((v,n)=>v!==old.deps[n])){old?.cleanup?.();cells[i]={deps};effects.push(()=>cells[i].cleanup=fn());}},
  useAccountProfile:auth=>({loaded:true,name:auth.name,email:auth.email,phone:'00000000000',professionType:'의사',specialty:'',region:''}),
  UserRound(){},FileText(){},URLSearchParams,URL:{createObjectURL:()=> 'blob:synthetic',revokeObjectURL(){}},AbortController,PRIVACY_FORM_VERSION:'synthetic',withBase:x=>x,
  validateResumePhoto,uploadResumePhoto:(file,options)=>uploadResumePhoto(file,{...options,timeoutMs:8,fetchImpl:fetcher}),saveResume:(body,options)=>saveResume(body,{...options,timeoutMs:8,fetchImpl:fetcher}),
  loadResumes:async()=>({resumes:[]}),invalidateSiteOperations:()=>calls.push({invalidate:true}),
  window:{location:{search:'?new=1'},requestAnimationFrame:fn=>fn(),scrollTo:()=>calls.push({scroll:true})},document:{querySelector:()=>null}};
 vm.createContext(ctx);vm.runInContext(code,ctx);vm.runInContext(ownerCode,ctx);
 const render=()=>{cursor=0;const page=ctx.render({auth});effects.splice(0).forEach(fn=>fn());return page;};
 render();render();return {ctx,auth,calls,render,unmount:()=>cells.forEach(x=>x?.cleanup?.()),fill:()=>{render().setForm(ready);return render();}};
}
const event={preventDefault(){}};
for(const scenario of ['failure','broken-json','session-expired','header-stall','body-stall','wrong-id'])test(`이력서 ${scenario}: 입력 유지·완료 금지·잠금 해제`,async()=>{
 const h=setup(async()=>{if(scenario==='header-stall')return new Promise(()=>{});return {ok:scenario!=='session-expired',status:401,json:async()=>{if(scenario==='body-stall')return new Promise(()=>{});if(scenario==='broken-json')throw Error('broken');if(scenario==='session-expired')return{error:'로그인 만료'};return {saved:scenario==='wrong-id',id:'OTHER'};}};});
 h.fill();h.render().setSavedResumeId('RES-QA');await h.render().submit(event);const p=h.render();
 assert.equal(p.completed,false);assert.equal(p.submitting,false);assert.ok(p.submitError);assert.equal(p.form.introduction,ready.introduction);assert.equal(p.savedResumeId,'RES-QA');assert.equal(h.calls.filter(x=>x.path).length,1);assert.equal(h.calls.some(x=>x.invalidate||x.scroll),false);
 if(scenario==='session-expired')assert.equal(p.needsLogin,true);
});
test('저장 중 중복 제출·입력 변경·사진 교체를 막고 확인된 결과로 완료한다',async()=>{
 let finish;const h=setup(()=>new Promise(resolve=>finish=()=>resolve(Response.json({saved:true,id:'RES-QA'}))));let p=h.fill();
 const first=p.submit(event);await p.submit(event);p.update('title','중간 변경');p.choosePhotoFile(file);p.removePhoto();
 assert.equal(h.calls.length,1);assert.equal(h.render().form.title,ready.title);assert.equal(h.render().photoFile,null);
 finish();await first;assert.equal(h.render().completed,true);assert.equal(h.render().submitting,false);
});
test('업로드 실패 플래그·외부 주소는 이력서 저장으로 이어지지 않는다',async()=>{
 const h=setup(async()=>Response.json({uploaded:false,url:'https://example.invalid/fake.png'}));h.fill().choosePhotoFile(file);await h.render().submit(event);
 assert.equal(h.calls.length,1);assert.equal(h.render().completed,false);assert.equal(h.render().photoFile,file);assert.ok(h.render().submitError);
});
test('사진 업로드 중 이탈하면 늦은 응답으로 이력서 POST·완료·스크롤하지 않는다',async()=>{
 let finish;const h=setup(()=>new Promise(resolve=>finish=()=>resolve(Response.json({uploaded:true,url:photoUrl}))));h.fill().choosePhotoFile(file);
 const run=h.render().submit(event);h.unmount();await run;finish();await ticks();
 assert.equal(h.calls.filter(x=>x.path).length,1);assert.equal(h.calls[0].signal.aborted,true);assert.equal(h.calls.some(x=>x.invalidate||x.scroll),false);assert.equal(h.render().completed,false);
});
test('이력서 저장 중 이탈해도 뒤늦은 완료는 현재 화면에 반영하지 않는다',async()=>{
 let finish;const h=setup(()=>new Promise(resolve=>finish=()=>resolve(Response.json({saved:true,id:'RES-QA'}))));const run=h.fill().submit(event);h.unmount();await run;finish();await ticks();
 assert.equal(h.render().completed,false);assert.equal(h.calls.some(x=>x.invalidate||x.scroll),false);
});
test('사진 삭제는 업로드 대기 중 막고 완료 후 확인한 사진을 표시한다',async()=>{
 let finish;const h=setup(async(path)=>path==='/api/uploads'?new Promise(resolve=>finish=()=>resolve(Response.json({uploaded:true,url:photoUrl}))):Response.json({saved:true,id:'RES-QA'}));h.fill().choosePhotoFile(file);
 const run=h.render().submit(event);h.render().removePhoto();assert.equal(h.render().photoFile,file);finish();await run;
 assert.equal(h.render().completed,true);assert.equal(h.render().form.photoUrl,photoUrl);assert.equal(h.render().photoFile,null);
});
test('사진 저장 후 이력서 실패를 재시도하면 사진을 중복 업로드하지 않는다',async()=>{
 let attempt=0;const h=setup(async(path)=>{if(path==='/api/uploads')return Response.json({uploaded:true,url:photoUrl});attempt++;return attempt===1?Response.json({error:'합성 저장 실패'},{status:503}):Response.json({saved:true,id:'RES-QA'});});h.fill().choosePhotoFile(file);
 await h.render().submit(event);assert.equal(h.render().completed,false);assert.equal(h.render().photoFile,file);
 await h.render().submit(event);assert.equal(h.render().completed,true);assert.deepEqual(h.calls.filter(x=>x.path).map(x=>x.path),['/api/uploads','/api/resumes','/api/resumes']);
});
test('사진 업로드의 세션 만료도 로그인 도움을 표시한다',async()=>{const h=setup(async()=>Response.json({error:'로그인 만료'},{status:401}));h.fill().choosePhotoFile(file);await h.render().submit(event);assert.equal(h.render().needsLogin,true);assert.equal(h.render().completed,false);});
test('같은 역할의 계정 전환은 별도 편집기를 만들고 초안·동의를 이전하지 않는다',()=>{
 const h=setup(async()=>Response.json({saved:true,id:'RES-QA'}));h.fill();const nextAuth={...h.auth,email:'qa-b@example.invalid',name:'합성 B'};
 assert.notEqual(h.ctx.ownerKey({auth:h.auth}),h.ctx.ownerKey({auth:nextAuth}));h.unmount();
 const next=setup(async()=>Response.json({saved:true,id:'RES-B'}),nextAuth);const p=next.render();assert.equal(p.form.introduction,'');assert.equal(p.form.consent,false);assert.equal(p.savedResumeId,'');assert.equal(p.form.name,'합성 B');assert.notEqual(p.form.title,ready.title);
});
