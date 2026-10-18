// Full customer journey through the built Cloudflare Worker and an isolated DB.
// Fresh signup/login, D1 document storage, fake PG approval, application and refund.
// No production credentials, network requests, mail, or actual card transactions.
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
import {PRIVACY_FORM_VERSION} from '../src/privacyConsent.js';
import worker from '../dist-cf/server/index.js';

const db=new DatabaseSync(':memory:');
const queryTrace=[];
for(const file of (await readdir(new URL('../drizzle/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort())db.exec(await readFile(new URL('../drizzle/'+file,import.meta.url),'utf8'));
class Statement {
 constructor(sql,args=[]){this.sql=sql;this.args=args;}
 bind(...args){return new Statement(this.sql,args.map(v=>v instanceof ArrayBuffer?new Uint8Array(v):v));}
 async all(){queryTrace.push(this.sql);return {results:db.prepare(this.sql).all(...this.args),success:true};}
 async first(column){const row=(await this.all()).results[0]||null;return column?row?.[column]:row;}
 async run(){queryTrace.push(this.sql);return {success:true,meta:{changes:Number(db.prepare(this.sql).run(...this.args).changes)}};}
}
const DB={prepare:sql=>new Statement(sql),exec:async sql=>db.exec(sql),batch:async list=>{
 queryTrace.push(...list.map(s=>s.sql));
 db.exec('BEGIN');try{const result=list.map(s=>{const p=db.prepare(s.sql);return /^\s*(SELECT|PRAGMA)/i.test(s.sql)?{results:p.all(...s.args),success:true}:{success:true,meta:{changes:Number(p.run(...s.args).changes)}};});db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}
}};
const config=JSON.parse(await readFile(new URL('../deploy/cloudflare.live-with-legacy-replies.json',import.meta.url),'utf8'));
const env={...config.vars,DB,D1_UPLOADS_ENABLED:'true',ACCOUNT_HASH_SECRET:'customer-journey-isolated-secret-at-least-32',ADMIN_EMAILS:'journey-admin@example.invalid',INICIS_MID:'UPmedihelp',INICIS_SIGN_KEY:'synthetic-sign-key',INICIS_MOBILE_HASH_KEY:'synthetic-mobile-key'};
let origin=env.SITE_ORIGIN;
const cookies={},checks=[];
const one=(sql,...args)=>db.prepare(sql).get(...args);
const check=(name,actual,expected)=>checks.push({name,actual,expected,pass:actual===expected});
const consent={privacyVersion:PRIVACY_FORM_VERSION,privacyConsent:true};
async function call(path,role='',body,method=body?'POST':'GET'){
 const response=await worker.fetch(new Request(origin+path,{method,headers:{origin,cookie:cookies[role]||'',...(body instanceof FormData?{}:{'content-type':'application/json'})},...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})}),env,{});
 const copy=response.clone();let data;try{data=await response.json();}catch{data={};}return {status:response.status,data,response:copy,cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
const password='Isolated-journey-2026!';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6Zf8AAAAASUVORK5CYII=','base64');
let active,pgCalls=0;
const originalFetch=globalThis.fetch;
globalThis.fetch=async url=>{
 if(String(url)!=='https://fcstdpay.inicis.com/api/payAuth'||!active)throw Error('Network disabled for customer journey');
 pgCalls++;return Response.json({resultCode:'0000',mid:env.INICIS_MID,MOID:active.order.orderNumber,TotPrice:String(active.order.totalAmount),payMethod:'Card',tid:active.tid});
};
async function buy(productId){
 const r=await call('/api/payment-orders','hospital',{...consent,checkoutAcknowledged:true,productId,metadata:{title:'격리 신규 회원 채용공고',hospital:'격리 신규 병원',department:'내과',address:'서울'}});
 check(productId+' checkout',r.status,201);if(r.status!==201)throw Error('Checkout failed: '+JSON.stringify(r.data));
 check(productId+' unpaid',(await call('/api/member-center','hospital')).data.orders.find(o=>o.orderNumber===r.data.order.orderNumber).status==='paid',false);
 active={...r.data,tid:'SYNTHETIC'+r.data.order.id.replaceAll('-','').slice(0,30)};
 const callback=()=>worker.fetch(new Request(origin+'/api/payment-approve',{method:'POST',headers:{origin:'https://fcstdpay.inicis.com','content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({resultCode:'0000',mid:env.INICIS_MID,orderNumber:active.order.orderNumber,merchantData:active.inicis.merchantData,authToken:'SYNTHETIC',idc_name:'fc',authUrl:'https://fcstdpay.inicis.com/api/payAuth',netCancelUrl:'https://fcstdpay.inicis.com/api/netCancel'})}),env,{});
 const before=pgCalls;await callback();await callback();check(productId+' one approval on replay',pgCalls-before,1);
 check(productId+' paid',(await call('/api/member-center','hospital')).data.orders.find(o=>o.orderNumber===r.data.order.orderNumber).status,'paid');
 return active;
}
try{
 check('production test switch disabled',(await call('/api/auth/test-switch','',{key:'admin'})).status,404);
 for(const role of ['doctor','hospital','admin']){
  const input={...consent,email:'journey-'+role+'@example.invalid',password,role:role==='hospital'?'hospital':'doctor',displayName:'격리 '+role,phone:'01000000000',professionType:'의사',termsAccepted:true,privacyAcknowledged:true,ageConfirmed:true};
  let body=input;
  if(role==='hospital'){
   body=new FormData();body.set('payload',JSON.stringify({...input,hospitalName:'격리 신규 병원',representativeName:'격리 대표',businessNumber:'123-45-67890',address:'서울 격리 시험 주소',hospitalDocumentConsent:true}));
   body.set('businessDocument',new Blob([png],{type:'image/png'}),'synthetic.png');
  }
  const registered=await call('/api/auth/register','',body);check(role+' fresh signup',registered.status,201);
  if(registered.status!==201)throw Error('Signup failed: '+JSON.stringify(registered.data));
  cookies[role]=registered.cookie;await call('/api/auth/logout',role,{});cookies[role]='';
  const login=await call('/api/auth/login','',{email:input.email,password});check(role+' clean password login',login.status,200);cookies[role]=login.cookie;
  check(role+' trusted admin status',(await call('/api/account',role)).data.isAdmin,role==='admin');
  check(role+' console access',(await call('/api/admin-console',role)).status,role==='admin'?200:403);
 }
 const hospitalId=one('SELECT account_id id FROM auth_credentials WHERE email_normalized=?','journey-hospital@example.invalid').id;
 const document=one('SELECT * FROM hospital_verification_requests WHERE account_id=?',hospitalId);
 check('D1 business document exists',Boolean(document),true);
 const documentPath='/api/admin-hospital-verifications/'+document.id+'/document';
 for(const role of ['', 'doctor','hospital'])check('document private '+(role||'guest'),(await call(documentPath,role)).status,403);
 const downloaded=await call(documentPath,'admin');check('admin document read',downloaded.status,200);
 check('stored document bytes intact',Buffer.from(await downloaded.response.arrayBuffer()).equals(png),true);
 check('business number normalized',(await call('/api/account','hospital')).data.hospitalProfile.businessNumber,'1234567890');
 const resume=await call('/api/resumes','doctor',{...consent,createNew:true,title:'신규 가입 연동 이력서',specialty:'내과',desiredRegions:'서울',detail:{introduction:'신규 가입부터 지원 및 유료 열람, 공개 철회와 환불까지 검증하는 격리 자료입니다.'}});
 check('fresh member saves resume',resume.status,201);
 const postInput={...consent,publicationAcknowledged:true,contactConsent:true,resumeId:resume.data.id,title:'격리 신규 구직글',contactVisibility:'ticket'};
 const post=await call('/api/job-seeker-posts','doctor',postInput);check('publishes seeker post',post.status,201);
 const detailPath='/api/talent-detail/seeker-'+post.data.post.id;
 check('public list hides contact',JSON.stringify((await call('/api/site-operations')).data).includes('010-0000-0000'),false);
 check('unpaid hospital cannot unlock',(await call(detailPath,'hospital')).data.unlocked,false);
 const ad=await buy('basic');
 const adId=ad.order.contentRecordId;
 check('approval publishes ad',(await call('/api/site-operations')).data.contents.some(c=>c.id===adId),true);
 const applicant={...consent,requestType:'doctor',thirdPartyConsent:true,recipient:'격리 신규 병원',payload:{jobId:'admin-'+adId,resumeId:resume.data.id,name:'변조',phone:'01000000000',specialty:'내과'}};
 const apply=await call('/api/consultations','doctor',applicant);check('new doctor applies to new hospital',apply.status,201);
 check('hospital sees own applicant',(await call('/api/member-center','hospital')).data.consultations.some(c=>c.id===apply.data.id),true);
 check('direct applicant not in headhunter queue',(await call('/api/consultations','admin')).data.requests.some(c=>c.id===apply.data.id),false);
 check('favorite save',(await call('/api/saved-jobs','doctor',{jobId:'admin-'+adId})).data.saved,true);
 check('favorite survives reload',(await call('/api/saved-jobs','doctor')).data.saved.includes('admin-'+adId),true);
 check('favorite isolated',(await call('/api/saved-jobs','hospital')).data.saved.includes('admin-'+adId),false);
 const concurrent=await Promise.all([call('/api/saved-jobs','doctor',{jobId:'edge-retry',saved:true}),call('/api/saved-jobs','doctor',{jobId:'edge-retry',saved:true})]);
 check('parallel favorite save responses',concurrent.every(r=>r.status===200&&r.data.saved===true),true);
 check('parallel favorite inserts once',one("SELECT COUNT(*) n FROM saved_jobs WHERE job_id='edge-retry'").n,1);
 await call('/api/saved-jobs','doctor',{jobId:'edge-retry',saved:true});
 check('replayed save remains selected',(await call('/api/saved-jobs','doctor')).data.saved.includes('edge-retry'),true);
 await call('/api/saved-jobs','doctor',{jobId:'edge-retry',saved:false});
 await call('/api/saved-jobs','doctor',{jobId:'edge-retry',saved:false});
 check('replayed removal remains removed',(await call('/api/saved-jobs','doctor')).data.saved.includes('edge-retry'),false);
 check('invalid favorite state rejected',(await call('/api/saved-jobs','doctor',{jobId:'edge-retry',saved:'false'})).status,400);
 check('invalid state cannot toggle stored value',(await call('/api/saved-jobs','doctor')).data.saved.includes('edge-retry'),false);
 await call('/api/saved-jobs','hospital',{jobId:'seeker-'+post.data.post.id,kind:'talent',saved:true});
 check('talent kind persists across reload',(await call('/api/saved-jobs?kind=talent','hospital')).data.saved.includes('seeker-'+post.data.post.id),true);
 check('talent favorite not in job list',(await call('/api/saved-jobs','hospital')).data.saved.includes('seeker-'+post.data.post.id),false);
 for(const invalidPath of ['/jobs/%','/mypage/inquiries/%E0%A4','/api/talent-detail/%FF'])check('invalid route controlled '+invalidPath,(await call(invalidPath)).status,400);
 const pack=await buy('talent-unlock-pack');
 check('pack initial balance',(await call('/api/member-center','hospital')).data.talentCredits.remaining,10);
 check('hospital now sees contact',(await call(detailPath,'hospital')).data.detail.phone,'010-0000-0000');
 await call(detailPath,'hospital');check('revisit charges once',(await call('/api/member-center','hospital')).data.talentCredits.remaining,9);
 check('contact withdrawal',(await call('/api/job-seeker-posts/'+post.data.post.id,'doctor',{...postInput,contactConsent:false,contactVisibility:'private'},'PATCH')).status,200);
 check('withdrawal hides already bought contact',(await call(detailPath,'hospital')).data.detail.phone,'');
 const refund=await call('/api/member-center','hospital',{action:'refund_request',orderNumber:pack.order.orderNumber,reason:'격리 미사용분 환불 검수'});
 check('customer refund request',refund.status,200);
 check('pending refund holds unused credits',(await call('/api/member-center','hospital')).data.talentCredits.remaining,0);
 const reject={refundId:refund.data.refundId,decision:'reject',reason:'격리 검수: 증빙 보완 후 다시 접수해주세요.'};
 check('rejection recorded',(await call('/api/admin-refund-review','admin',reject)).status,200);
 const rejectedCenter=(await call('/api/member-center','hospital')).data;
 check('rejection restores remaining credits',rejectedCenter.talentCredits.remaining,9);
 check('customer sees reason',rejectedCenter.refunds.find(r=>r.id===refund.data.refundId).customerMessage,reject.reason);
 const retry=await call('/api/member-center','hospital',{action:'refund_request',orderNumber:pack.order.orderNumber,reason:'격리 증빙 보완 재접수'});
 check('refund retry accepted',retry.status,200);
 const partial={refundId:retry.data.refundId,decision:'record_external',evidence:{tid:pack.tid,amount:26100,remainingAmount:2900,cancellationTid:'SYNTHETIC-CANCEL-JOURNEY',canceledAt:new Date().toISOString(),reference:'격리된 PG 취소 증빙 시뮬레이션',customerMessage:'격리 검수: 사용한 1건을 제외한 미사용분 환불 완료. 남은 이용권은 종료됩니다.',confirmed:true}};
 const canceled=await call('/api/admin-refund-review','admin',partial);check('partial refund reflected',canceled.status,200);
 const refunded=(await call('/api/member-center','hospital')).data;
 check('partial refund amount in member history',refunded.orders.find(o=>o.orderNumber===pack.order.orderNumber).refundedAmount,26100);
 check('partial refund ends unused credits',refunded.talentCredits.remaining,0);
 check('processed notification exists',refunded.alerts.some(a=>a.id==='refund-result-'+retry.data.refundId),true);
 check('repeated refund cannot duplicate ledger',(await call('/api/admin-refund-review','admin',partial)).status,409);
 check('one partial refund row',one("SELECT COUNT(*) n FROM payment_transactions WHERE order_id=? AND transaction_type='refund'",pack.order.id).n,1);
 check('paid ad unaffected by ticket refund',(await call('/api/site-operations')).data.contents.some(c=>c.id===adId),true);
 queryTrace.length=0;
 const notifications=await call('/api/member-center?notificationsOnly=1','hospital');
 check('lightweight notifications authorized',notifications.status,200);
 check('lightweight notifications match full member view',JSON.stringify(notifications.data.alerts),JSON.stringify(refunded.alerts));
 check('notification reads do not update posts or paid ads',queryTrace.some(sql=>/^(UPDATE|INSERT|DELETE)/i.test(sql)),false);
 check('notification reads do not load payment ledger',queryTrace.some(sql=>/payment_orders|payment_refunds|talent_credits/.test(sql)),false);
 queryTrace.length=0;
 check('account still returns trusted hospital profile',(await call('/api/account','hospital')).data.hospitalProfile.businessNumber,'1234567890');
 check('account lookup does not run post expiration',queryTrace.some(sql=>/UPDATE job_seeker_posts/.test(sql)),false);
 // Public board reads must still expire old posts before returning any content.
 db.prepare("UPDATE job_seeker_posts SET status='active',public_until='2000-01-01 00:00:00' WHERE id=?").run(post.data.post.id);
 const expiredBoard=await call('/api/site-operations','hospital');
 check('expired post stays hidden after optimization',expiredBoard.data.contents.some(c=>c.id==='seeker-'+post.data.post.id),false);
 check('expiration records state change',one('SELECT status FROM job_seeker_posts WHERE id=?',post.data.post.id).status,'closed');

 for(const role of ['doctor','hospital','admin']){check(role+' logout',(await call('/api/auth/logout',role,{})).status,200);check(role+' expired session blocked',(await call('/api/member-center',role)).status,401);}
 check('only simulated provider approvals',pgCalls,2);
 check('database integrity',one('PRAGMA integrity_check').integrity_check,'ok');
 check('foreign keys intact',db.prepare('PRAGMA foreign_key_check').all().length,0);
}finally{globalThis.fetch=originalFetch;if(!process.argv.includes('--serve'))db.close();}
console.log(JSON.stringify({scope:'fresh customer lifecycle; isolated Cloudflare Worker/D1 adapter; no external network',total:checks.length,failures:checks.filter(c=>!c.pass)},null,2));
if(checks.some(c=>!c.pass))process.exitCode=1;

// Optional browser inspection against the same disposable data, never production.
if(process.argv.includes('--serve')&&!process.exitCode){
 const {default:localWorker}=await import('../dist/server/index.js');
 const {createServer}=await import('node:http');
 const localOrigin='http://127.0.0.1:5197';env.SITE_ORIGIN=localOrigin;origin=localOrigin;
 globalThis.fetch=async()=>{throw Error('External network disabled in local visual audit');};
 createServer(async(req,res)=>{
  try{
   console.log('UI request: '+req.method+' '+req.url);
   const role=req.url.match(/^\/__login\/(doctor|hospital|admin)$/)?.[1];
   if(role){const login=await call('/api/auth/login','',{email:'journey-'+role+'@example.invalid',password});res.writeHead(302,{'set-cookie':login.cookie+'; Path=/; HttpOnly; SameSite=Lax',location:'/mypage?tab=payments'});res.end();return;}
   const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);
   const response=await localWorker.fetch(new Request(localOrigin+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{})}),env,{});
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(500);res.end('Isolated visual audit request failed');}
 }).listen(5197,'127.0.0.1',()=>console.log('Isolated customer UI: '+localOrigin));
}
