import test from 'node:test';
import assert from 'node:assert/strict';
import {saveResume} from './resumeApi.js';
import {uploadResumePhoto,validateResumePhoto} from './resumePhotoUpload.js';
const file={type:'image/png',size:12};
const url='/api/uploads/profiles/QA/resume-profile/PHOTO.png';
const operations=[['이력서',options=>saveResume({resumeId:'RES-QA'},options),{saved:true,id:'RES-QA'}],['사진',options=>uploadResumePhoto(file,options),{uploaded:true,url}]];
for(const [name,run,result] of operations){
 test(`${name} 정상 저장 응답과 요청 방식`,async()=>{let options;const value=await run({fetchImpl:async(_path,init)=>{options=init;return Response.json(result);}});assert.equal(options.method,'POST');assert.equal(options.credentials,'same-origin');assert.ok(options.signal);assert.deepEqual(value,name==='사진'?url:result);});
 for(const phase of ['header','body'])test(`${name} ${phase} 무응답 제한과 자동 재시도 금지`,async()=>{let calls=0,signal;await assert.rejects(run({timeoutMs:5,fetchImpl:async(_path,init)=>{calls++;signal=init.signal;return phase==='header'?new Promise(()=>{}):{ok:true,json:()=>new Promise(()=>{})};}}),/결과를 확인하지 못했습니다/);assert.equal(calls,1);assert.equal(signal.aborted,true);});
 for(const status of [401,403,503])test(`${name} HTTP ${status} 실패 사유·상태 보존`,async()=>{await assert.rejects(run({fetchImpl:async()=>Response.json({error:'합성 실패'},{status})}),error=>error.status===status&&error.message==='합성 실패');});
 for(const value of [null,{}, {saved:false,id:'RES-QA',uploaded:false,url}])test(`${name} 실패 계약 ${JSON.stringify(value)}`,async()=>{await assert.rejects(run({fetchImpl:async()=>Response.json(value)}));});
 test(`${name} 손상 JSON·네트워크 오류에서 저장 완료를 보고하지 않는다`,async()=>{for(const fetchImpl of [async()=>new Response('broken'),async()=>{throw Error('offline');}])await assert.rejects(run({fetchImpl}),/결과를 확인하지 못했습니다/);});
 test(`${name} 화면 종료는 요청과 본문 대기 모두 중단한다`,async()=>{for(const phase of ['header','body']){let signal;const controller=new AbortController();const promise=run({signal:controller.signal,fetchImpl:async(_path,init)=>{signal=init.signal;return phase==='header'?new Promise(()=>{}):{ok:true,json:()=>new Promise(()=>{})};}});controller.abort();await assert.rejects(promise,error=>error.name==='AbortError');assert.equal(signal.aborted,true);}});
 test(`${name} 이미 종료된 화면은 요청을 보내지 않는다`,async()=>{const controller=new AbortController();controller.abort();let calls=0;await assert.rejects(run({signal:controller.signal,fetchImpl:async()=>{calls++;return Response.json(result);}}));assert.equal(calls,0);});
}
test('수정은 요청한 이력서 ID 응답만 수락한다',async()=>{await assert.rejects(saveResume({resumeId:'RES-QA'},{fetchImpl:async()=>Response.json({saved:true,id:'OTHER'})}),/저장 완료 응답/);for(const id of [' ', '../escape', 10])await assert.rejects(saveResume({createNew:true},{fetchImpl:async()=>Response.json({saved:true,id})}));});
test('사진은 업로드 성공과 보호된 프로필 경로가 모두 필요하다',async()=>{for(const bad of ['https://example.invalid/a.png','javascript:alert(1)','/api/uploads/hospitals/QA/logo/a.png','/api/uploads/profiles/QA/resume-profile/../a.png','/api/uploads/profiles/QA/resume-profile/a.png?external=1'])await assert.rejects(uploadResumePhoto(file,{fetchImpl:async()=>Response.json({uploaded:true,url:bad})}),/사진 저장 완료/);});
test('빈 파일·지원하지 않는 사진·초과 용량을 전송 전에 거부한다',()=>{assert.match(validateResumePhoto({...file,size:0}),/빈 사진/);assert.match(validateResumePhoto({...file,type:'text/html'}),/사진만/);assert.match(validateResumePhoto({...file,size:5*1024*1024+1}),/5MB/);assert.equal(validateResumePhoto(file),'');});
