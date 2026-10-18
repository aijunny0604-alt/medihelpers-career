import { loadResumes } from './resumeApi.js';

export async function loadJobSeekerEditor({postId='',base='',signal,timeoutMs=12000,fetchImpl=fetch}={}) {
  const controller=new AbortController();
  let timer,cancel;
  const deadline=new Promise((_,reject)=>{
    cancel=()=>{reject(new Error('구직글 조회가 취소되었습니다.'));controller.abort();};
    timer=setTimeout(()=>{reject(new Error('구직글 조회 응답이 지연됩니다. 다시 불러오기를 눌러주세요.'));controller.abort();},timeoutMs);
    if(signal?.aborted)cancel();else signal?.addEventListener('abort',cancel,{once:true});
  });
  const options={endpoint:base+'/api/resumes',signal:controller.signal,timeoutMs,fetchImpl};
  try {
    const request=(async()=>{
      const [resumeData,response]=await Promise.all([
        loadResumes(options),
        fetchImpl(base+'/api/job-seeker-posts'+(postId?'/'+encodeURIComponent(postId):''),{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'},signal:controller.signal}),
      ]);
      const data=await response.json().catch(()=>null);
      if(!response.ok)throw new Error(data?.error || '구직글을 불러오지 못했습니다.');
      if(postId ? data?.post?.id!==postId : !Array.isArray(data?.posts))throw new Error('구직글 조회 응답을 확인하지 못했습니다. 다시 불러오기를 눌러주세요.');
      const resumes=[...resumeData.resumes],post=postId?data.post:null;
      if(post && !post.resumeId)throw new Error('구직글에 연결된 이력서를 확인할 수 없습니다.');
      if(post && !resumes.some(resume=>resume.id===post.resumeId)) {
        const linked=await loadResumes({...options,id:post.resumeId});
        resumes.push(...linked.resumes);
      }
      return {resumes,post,posts:postId?[]:data.posts};
    })();
    return await Promise.race([request,deadline]);
  } finally {clearTimeout(timer);signal?.removeEventListener('abort',cancel);controller.abort();}
}
