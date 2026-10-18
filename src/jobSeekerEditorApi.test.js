import test from 'node:test';
import assert from 'node:assert/strict';
import {loadJobSeekerEditor} from './jobSeekerEditorApi.js';

test('post edit fetches its owned resume even outside the latest list',async()=>{
  const paths=[];
  const result=await loadJobSeekerEditor({postId:'post/1',fetchImpl:async path=>{
    paths.push(path);
    if(path==='/api/resumes')return Response.json({resumes:[{id:'recent'}]});
    if(path==='/api/job-seeker-posts/post%2F1')return Response.json({post:{id:'post/1',resumeId:'old'}});
    assert.equal(path,'/api/resumes?id=old');return Response.json({resumes:[{id:'old',title:'원본'}]});
  }});
  assert.equal(paths.length,3);assert.deepEqual(result.resumes.map(r=>r.id),['recent','old']);assert.equal(result.post.resumeId,'old');
});
test('new post loads owned list without inventing a selected publication',async()=>{
  const result=await loadJobSeekerEditor({fetchImpl:async path=>Response.json(path==='/api/resumes'?{resumes:[]}:{posts:[]})});
  assert.deepEqual(result,{resumes:[],post:null,posts:[]});
});
test('missing, malformed and unauthorized post data never become a blank editor',async()=>{
  for(const response of [Response.json({}),Response.json({post:{id:'wrong',resumeId:'r'}}),Response.json({error:'없음'},{status:404})]){
    await assert.rejects(loadJobSeekerEditor({postId:'p',fetchImpl:async path=>path==='/api/resumes'?Response.json({resumes:[]}):response}));
  }
  await assert.rejects(loadJobSeekerEditor({postId:'p',fetchImpl:async path=>{
    if(path==='/api/resumes')return Response.json({resumes:[]});
    if(path.startsWith('/api/resumes?'))return Response.json({error:'본인 이력서 없음'},{status:404});
    return Response.json({post:{id:'p',resumeId:'foreign'}});
  }}),/본인 이력서 없음/);
});
test('stalled post response body has a bounded retryable failure',async()=>{
  await assert.rejects(loadJobSeekerEditor({timeoutMs:5,fetchImpl:async path=>path==='/api/resumes'?Response.json({resumes:[]}):{ok:true,json:()=>new Promise(()=>{})}}),/응답이 지연/);
});
