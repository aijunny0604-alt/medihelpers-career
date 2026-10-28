import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./HospitalAdEditPage.jsx',import.meta.url),'utf8').replaceAll('\r\n','\n');
const submitBody = source.match(/const submit = async \(event\) => \{([\s\S]*?)\n  \};/)[1];
const chooseBody = source.match(/const choose = async \(nextFile, input\) => \{([\s\S]*?)\n  \};/)[1];
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
const bind = (body,deps) => new AsyncFunction(...Object.keys(deps),body).bind(null,...Object.values(deps));
const deferred = () => { let resolve; const promise=new Promise(r=>{resolve=r;}); return {promise,resolve}; };
function setup(extras={}) {
  const log={errors:[],saved:[],forms:[],cleared:0,invalidated:0,navigated:[],posts:0,uploads:[]};
  const deps={event:{preventDefault(){}},submitLock:{current:false},mounted:{current:true},preparingRef:{current:0},
    setSubmitting(){},setError:x=>log.errors.push(x),setSaved:x=>log.saved.push(x),
    logoFile:null,bannerFile:null,form:{title:'검수용 공고',logo:'old-logo',banner:'old-banner'},ad:{contentRecordId:'record'},
    uploadJobImage:async(file,purpose)=>{log.uploads.push(purpose);return '/uploaded/'+purpose;},
    saveHospitalAd:async()=>{log.posts++;},invalidateSiteOperations:()=>log.invalidated++,
    setForm:fn=>log.forms.push(fn(deps.form)),setLogoFile:()=>log.cleared++,setBannerFile:()=>log.cleared++,
    window:{location:{assign:path=>log.navigated.push(path)}},withBase:path=>path,...extras};
  return {deps,log,run:bind(submitBody,deps)};
}
test('편집 이미지 준비 중에는 저장 요청을 시작하지 않는다',async()=>{
  const h=setup({preparingRef:{current:1}});await h.run();
  assert.equal(h.log.posts,0);assert.match(h.log.errors.at(-1),/이미지 준비/);
});
test('편집 저장의 빠른 중복 제출은 한 번만 전송한다',async()=>{
  const pending=deferred();let posts=0;
  const h=setup({saveHospitalAd:()=>{posts++;return pending.promise;}});
  const first=h.run();await h.run();assert.equal(posts,1);
  pending.resolve();await first;assert.equal(h.deps.submitLock.current,false);assert.equal(h.log.navigated.length,1);
});
test('로고 업로드 중 화면을 떠나면 배너 업로드와 공고 저장을 실행하지 않는다',async()=>{
  const pending=deferred();let uploads=0;
  const h=setup({logoFile:{},bannerFile:{},uploadJobImage:()=>{uploads++;return pending.promise;}});
  const first=h.run();h.deps.mounted.current=false;pending.resolve('/logo');await first;
  assert.equal(uploads,1);assert.equal(h.log.posts,0);assert.equal(h.log.navigated.length,0);assert.equal(h.log.cleared,0);
});
test('배너 업로드 중 화면을 떠나면 공고 저장을 실행하지 않는다',async()=>{
  const pending=deferred();const h=setup({bannerFile:{},uploadJobImage:()=>pending.promise});
  const first=h.run();h.deps.mounted.current=false;pending.resolve('/banner');await first;
  assert.equal(h.log.posts,0);assert.equal(h.log.navigated.length,0);
});
test('저장 응답을 기다리다 화면을 떠나면 늦은 응답으로 이동하거나 상태를 지우지 않는다',async()=>{
  const pending=deferred();const h=setup({saveHospitalAd:()=>pending.promise});
  const first=h.run();h.deps.mounted.current=false;pending.resolve();await first;
  assert.equal(h.log.navigated.length,0);assert.equal(h.log.cleared,0);assert.equal(h.log.invalidated,0);
  assert.deepEqual(h.log.saved,[false]);
});
test('저장 실패는 입력과 선택 파일을 보존하고 완료 화면으로 이동하지 않는다',async()=>{
  const h=setup({logoFile:{},saveHospitalAd:async()=>{throw new Error('저장 결과 불명');}});await h.run();
  assert.equal(h.log.cleared,0);assert.equal(h.log.forms.length,0);assert.equal(h.log.navigated.length,0);
  assert.match(h.log.errors.at(-1),/불명/);assert.equal(h.deps.submitLock.current,false);
});
test('성공 확인 이후에만 이미지 URL을 반영하고 공개 공고로 이동한다',async()=>{
  const h=setup({logoFile:{},bannerFile:{}});await h.run();
  assert.deepEqual(h.log.uploads,['logo','banner']);assert.equal(h.log.posts,1);
  assert.equal(h.log.forms[0].logo,'/uploaded/logo');assert.equal(h.log.forms[0].banner,'/uploaded/banner');
  assert.equal(h.log.cleared,2);assert.equal(h.log.invalidated,1);assert.deepEqual(h.log.saved,[false,true]);
  assert.deepEqual(h.log.navigated,['/jobs/admin-record']);
});
test('연속 이미지 선택은 늦게 끝난 이전 파일이 새 미리보기를 덮지 않는다',async()=>{
  const first=deferred(),second=deferred(),selection={current:0},changes=[],busy=[];let pending=0;
  const deps={input:{value:'chosen'},disabled:false,selection,purpose:'banner',setError(){},setNotice(){},setPreparing:x=>busy.push(x),
    onPreparing:delta=>pending+=delta,onChange:file=>changes.push(file),prepareImageUpload:file=>file.id===1?first.promise:second.promise};
  const a=bind(chooseBody,{...deps,nextFile:{id:1}})();const b=bind(chooseBody,{...deps,nextFile:{id:2}})();
  assert.equal(pending,2);second.resolve({file:'newest',notice:''});await b;
  first.resolve({file:'older',notice:''});await a;
  assert.deepEqual(changes,['newest']);assert.equal(pending,0);assert.equal(busy.at(-1),false);
});
test('이미지 준비 중 제거·화면 종료는 늦은 준비 결과를 반영하지 않는다',async()=>{
  const pending=deferred(),selection={current:0},changes=[];let tasks=0;
  const run=bind(chooseBody,{nextFile:{},input:null,disabled:false,selection,purpose:'logo',setError(){},setNotice(){},setPreparing(){},
    onPreparing:delta=>tasks+=delta,onChange:file=>changes.push(file),prepareImageUpload:()=>pending.promise});
  const first=run();selection.current++;pending.resolve({file:'late',notice:''});await first;
  assert.deepEqual(changes,[]);assert.equal(tasks,0);
});
test('최신 이미지 해독이 실패해도 이전 선택의 늦은 성공으로 교체하지 않는다',async()=>{
  const previous=deferred(),selection={current:0},changes=[],errors=[];let tasks=0;
  const deps={input:null,disabled:false,selection,purpose:'banner',setError:x=>errors.push(x),setNotice(){},setPreparing(){},
    onPreparing:delta=>tasks+=delta,onChange:file=>changes.push(file),
    prepareImageUpload:file=>file.id===1?previous.promise:Promise.reject(new Error('새 파일 손상'))};
  const first=bind(chooseBody,{...deps,nextFile:{id:1}})();await bind(chooseBody,{...deps,nextFile:{id:2}})();
  previous.resolve({file:'old-selection',notice:''});await first;
  assert.deepEqual(changes,[]);assert.equal(errors.at(-1),'새 파일 손상');assert.equal(tasks,0);
});
