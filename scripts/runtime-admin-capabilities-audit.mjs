// Generated Cloudflare Worker, isolated SQLite, fresh credential logins and fake PG.
// Never connects to production, sends mail or charges a card.
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
import {PRIVACY_FORM_VERSION} from '../src/privacyConsent.js';
import worker from '../dist-cf/server/index.js';
const db=new DatabaseSync(':memory:');
for(const f of (await readdir(new URL('../drizzle/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort()) db.exec(await readFile(new URL('../drizzle/'+f,import.meta.url),'utf8'));
class Statement {
 constructor(sql,args=[]){this.sql=sql;this.args=args;}
 bind(...args){return new Statement(this.sql,args);}
 async all(){return {results:db.prepare(this.sql).all(...this.args),success:true};}
 async first(column){const r=(await this.all()).results[0]||null;return column?r?.[column]:r;}
 async run(){return {success:true,meta:{changes:Number(db.prepare(this.sql).run(...this.args).changes)}};}
}
const DB={prepare:sql=>new Statement(sql),exec:async sql=>db.exec(sql),batch:async statements=>{
 db.exec('BEGIN');try{const rows=[];for(const s of statements)rows.push(/^\s*(SELECT|PRAGMA)/i.test(s.sql)?await s.all():await s.run());db.exec('COMMIT');return rows;}catch(e){db.exec('ROLLBACK');throw e;}
}};
const deployment=JSON.parse(await readFile(new URL('../deploy/cloudflare.live-with-legacy-replies.json',import.meta.url),'utf8'));
const env={...deployment.vars,DB,ACCOUNT_HASH_SECRET:'admin-capabilities-isolated-secret-at-least-32',ADMIN_EMAILS:'admin@medihelpers.co.kr',INICIS_MID:'UPmedihelp',INICIS_SIGN_KEY:'synthetic-sign-key',INICIS_MOBILE_HASH_KEY:'synthetic-mobile-key'};
const origin=env.SITE_ORIGIN,cookies={},checks=[];
const check=(name,actual,expected)=>checks.push({name,actual,expected,pass:actual===expected});
const one=(sql,...args)=>db.prepare(sql).get(...args);
const consent={privacyVersion:PRIVACY_FORM_VERSION,privacyConsent:true,publicationAcknowledged:true,checkoutAcknowledged:true,contactConsent:true};
async function call(path,role='',body,method=body?'POST':'GET',settings=env,extraHeaders={}){
 const r=await worker.fetch(new Request(origin+path,{method,headers:{origin,'content-type':'application/json',cookie:cookies[role]||'',...extraHeaders},...(body?{body:JSON.stringify({...consent,...body})}:{})}),settings,{});
 let data;try{data=await r.json();}catch{} return {status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0]};
}
const emails={doctor:'doctor-test@medihelpers.co.kr',hospital:'hospital-test@medihelpers.co.kr',admin:'admin@medihelpers.co.kr'},ids={};
const originalFetch=globalThis.fetch;let pgCalls=0,active;
globalThis.fetch=async(url)=>{
 if(String(url)!=='https://fcstdpay.inicis.com/api/payAuth'||!active)throw Error('Unexpected external request blocked');
 pgCalls++;return Response.json({resultCode:'0000',mid:env.INICIS_MID,MOID:active.order.orderNumber,TotPrice:String(active.order.totalAmount),payMethod:'Card',tid:active.tid});
};
try{
 for(const role of Object.keys(emails)){
  await call('/api/auth/test-switch','',{key:role},'POST',{...env,TEST_ACCOUNT_SWITCH_ENABLED:'true'});
  // Discard bootstrap cookies: validate password login without any existing session.
  const login=await call('/api/auth/login','',{email:emails[role],password:'medihelpers1234'});
  check(role+' fresh login',login.status,200);check(role+' admin claim',login.data.isAdmin,role==='admin');cookies[role]=login.cookie;
  ids[role]=one('SELECT account_id id FROM auth_credentials WHERE email_normalized=?',emails[role]).id;
  check(role+' admin console',(await call('/api/admin-console',role)).status,role==='admin'?200:403);
  check(role+' resumes',(await call('/api/resumes',role)).status,role==='hospital'?403:200);
  check(role+' seeker posts',(await call('/api/job-seeker-posts',role)).status,role==='hospital'?403:200);
  check(role+' member center',(await call('/api/member-center',role)).status,200);
 }
 for(const role of ['', 'doctor'])for(const productId of ['basic','talent-unlock-single']){
  check((role||'guest')+' forged admin purchase blocked',(await call('/api/payment-orders',role,{productId,isAdmin:true,role:'admin',email:emails.admin,metadata:{adminPurchase:true}},'POST',env,{'x-admin':'true'})).status,role?403:401);
 }
 check('admin missing billing data is actionable',(await call('/api/payment-orders','admin',{productId:'talent-unlock-single'})).status,400);
 const profile={displayName:'격리 관리자',phone:'010-0000-0000',organization:'',jobTitle:'운영자',email:'forged@example.invalid',role:'hospital'};
 check('nonadmin cannot edit registration identity',(await call('/api/member-center','doctor',{profile},'PATCH')).status,403);
 check('admin can save own billing profile',(await call('/api/member-center','admin',{profile},'PATCH')).status,200);
 check('invalid billing contact rejected',(await call('/api/member-center','admin',{profile:{phone:'not-a-phone'}},'PATCH')).status,400);
 check('bad contact does not overwrite saved data',one('SELECT phone FROM member_profiles WHERE account_id=?',ids.admin).phone,profile.phone);
 check('profile cannot change stored role',one('SELECT role FROM accounts WHERE id=?',ids.admin).role,'doctor');
 check('profile cannot change login principal',one('SELECT email_normalized email FROM auth_credentials WHERE account_id=?',ids.admin).email,emails.admin);
 check('profile visible after refresh',(await call('/api/account','admin')).data.profile.phone,'010-0000-0000');
 const mobile=await call('/api/payment-orders','admin',{productId:'talent-unlock-single',paymentChannel:'mobile'},'POST',env,{'user-agent':'iPhone Mobile Synthetic'});
 check('admin mobile checkout prepared',mobile.status,201);
 check('admin mobile returns signed parameters',Boolean(mobile.data.inicis?.fields?.P_CHKFAKE),true);
 check('admin hospital consultation',(await call('/api/consultations','admin',{requestType:'hospital',payload:{hospital:'격리 검수기관',phone:profile.phone,specialty:'내과',message:'격리 DB 확인'}})).status,201);
 check('doctor cannot pretend to be hospital',(await call('/api/consultations','doctor',{requestType:'hospital',payload:{hospital:'격리 검수기관',phone:profile.phone,specialty:'내과',message:'격리 DB 확인'}})).status,403);
 const resume=await call('/api/resumes','admin',{createNew:true,title:'격리 관리자 이력서',name:'격리 관리자',phone:profile.phone,profession:'의사',specialty:'내과',desiredRegions:'서울',detail:{introduction:'격리 DB에서만 작성하는 기능 점검용 경력 소개입니다.'}});
 check('admin own resume',resume.status,201);
 const post=await call('/api/job-seeker-posts','admin',{resumeId:resume.data.id,title:'격리 관리자 구직글',contactVisibility:'private'});
 check('admin own seeker post',post.status,201);
 check('admin private resume read',(await call('/api/talent-detail/resume-'+resume.data.id,'admin')).data.unlocked,true);
 check('other doctor cannot edit admin resume',(await call('/api/resumes','doctor',{resumeId:resume.data.id,title:'forged update'})).status,404);
 check('admin both activities in center',Boolean((await call('/api/member-center','admin')).data.jobSeekerPosts.find(p=>p.id===post.data.post.id)),true);
 check('admin own seeker deletion',(await call('/api/job-seeker-posts/'+post.data.post.id,'admin',{},'DELETE')).status,200);
 for(const productId of ['talent-unlock-single','basic']){
  const r=await call('/api/payment-orders','admin',{productId,customerName:'forged',customerPhone:'forged',metadata:{title:'격리 관리자 광고',hospital:'검수기관',department:'내과'}});
  check(productId+' admin creates own order',r.status,201);if(r.status!==201)throw Error(JSON.stringify(r.data));
  const row=one('SELECT account_id owner,customer_name name,customer_email email,customer_phone phone,status FROM payment_orders WHERE id=?',r.data.order.id);
  check('order belongs to admin',row.owner,ids.admin);
  if(productId==='talent-unlock-single'){check('buyer name from server',row.name,profile.displayName);check('buyer email from server',row.email,emails.admin);check('buyer phone from server',row.phone,profile.phone);}
  check('approval is still required',row.status==='paid',false);
  check('admin cannot approve via JSON',(await call('/api/payment-approve','admin',{orderNumber:r.data.order.orderNumber})).status,403);
  check('admin reopens own unpaid order',(await call('/api/payment-orders','admin',{resumeOrderNumber:r.data.order.orderNumber})).status,200);
  check('hospital cannot reopen admin order',(await call('/api/payment-orders','hospital',{resumeOrderNumber:r.data.order.orderNumber})).status,404);
  active={...r.data,tid:'INIMX_CARDUPmedihelp'+r.data.order.id.replaceAll('-','').slice(0,20)};
  const f=active.inicis;
  const callback=()=>worker.fetch(new Request(origin+'/api/payment-approve',{method:'POST',headers:{origin:'https://fcstdpay.inicis.com','content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({resultCode:'0000',mid:env.INICIS_MID,orderNumber:active.order.orderNumber,merchantData:f.merchantData,authToken:'SYNTHETIC_AUTH',idc_name:'fc',authUrl:'https://fcstdpay.inicis.com/api/payAuth',netCancelUrl:'https://fcstdpay.inicis.com/api/netCancel'})}),env,{});
  const before=pgCalls;await callback();await callback();check('one simulated approval',pgCalls-before,1);
  const center=(await call('/api/member-center','admin')).data;
  const order=center.orders.find(o=>o.orderNumber===active.order.orderNumber);check('paid in own history',order.status,'paid');
  check('not in other member history',(await call('/api/member-center','hospital')).data.orders.some(o=>o.orderNumber===active.order.orderNumber),false);
  if(productId==='talent-unlock-single'){
   check('one credit in center',center.talentCredits.remaining,1);check('unused credit in order',order.creditUsage.used,0);
   check('admin views do not consume purchase',one('SELECT used_credits used FROM talent_credit_pools WHERE order_id=?',active.order.id).used,0);
   check('other member refund denied',(await call('/api/member-center','hospital',{action:'refund_request',orderNumber:order.orderNumber,reason:'격리 검수용 사유'})).status,404);
   const refund=await call('/api/member-center','admin',{action:'refund_request',orderNumber:order.orderNumber,reason:'격리 결제 검수 종료'});check('admin own refund request',refund.status,200);
   const recorded=await call('/api/admin-refund-review','admin',{refundId:refund.data.refundId,decision:'record_external',evidence:{tid:active.tid,amount:3900,canceledAt:new Date().toISOString(),reference:'isolated synthetic merchant cancellation evidence',confirmed:true}});
   check('manual refund reconciled',recorded.status,200);
   check('no credit after refund',(await call('/api/member-center','admin')).data.talentCredits.remaining,0);
  }else{
   check('ad published after approval',order.adStatus,'published');
   check('admin edits own ad',(await call('/api/member-center','admin',{action:'owned_ad_update',contentRecordId:order.contentRecordId,content:{...order.adPayload,title:'수정한 관리자 공고',hospital:'검수기관'}})).status,200);
   check('hospital cannot edit admin ad',(await call('/api/member-center','hospital',{action:'owned_ad_update',contentRecordId:order.contentRecordId,content:{title:'변조한 제목',hospital:'검수기관'}})).status,404);
  }
 }
 // A different stored membership role must not remove genuine admin capabilities.
 db.prepare("UPDATE accounts SET role='hospital' WHERE id=?").run(ids.admin);
 check('hospital-role admin resumes',(await call('/api/resumes','admin')).status,200);
 check('hospital-role admin seeker posts',(await call('/api/job-seeker-posts','admin')).status,200);
 db.prepare("UPDATE account_admin_profiles SET status='suspended' WHERE account_id=?").run(ids.admin);
 check('suspended admin cannot purchase',(await call('/api/payment-orders','admin',{productId:'talent-unlock-single'})).status,401);
 db.prepare("UPDATE account_admin_profiles SET status='active' WHERE account_id=?").run(ids.admin);
 db.prepare("UPDATE accounts SET role='doctor' WHERE id=?").run(ids.admin);
 check('server revokes admin without trusting old cookie',(await call('/api/payment-orders','admin',{productId:'talent-unlock-single'},'POST',{...env,ADMIN_EMAILS:''})).status,403);
 check('revoked admin cannot open console',(await call('/api/admin-console','admin',undefined,'GET',{...env,ADMIN_EMAILS:''})).status,403);
 for(const role of Object.keys(emails)){
  check(role+' logout',(await call('/api/auth/logout',role,{})).status,200);
  check(role+' old cookie rejected',(await call('/api/member-center',role)).status,401);
 }
 check('SQLite integrity',one('PRAGMA integrity_check').integrity_check,'ok');
 const failures=checks.filter(c=>!c.pass);console.log(JSON.stringify({scope:'isolated Cloudflare Worker; fresh credential sessions; simulated approval/refund',total:checks.length,passed:checks.length-failures.length,failures},null,2));
 if(failures.length)process.exitCode=1;
}finally{globalThis.fetch=originalFetch;if(!process.argv.includes('--serve'))db.close();}

if(process.argv.includes('--serve') && !process.exitCode){
 const {default:localWorker}=await import('../dist/server/index.js');
 const {createServer}=await import('node:http');
 const localOrigin='http://127.0.0.1:5196';
 const login=await call('/api/auth/login','',{email:emails.admin,password:'medihelpers1234'});
 if(!login.cookie)throw Error('Local visual session unavailable');
 createServer(async(req,res)=>{
  try{
   if(req.url==='/__admin'){res.writeHead(302,{'set-cookie':login.cookie+'; Path=/; HttpOnly; SameSite=Lax',location:'/talent-unlock?product=talent-unlock-single'});res.end();return;}
   // Visual QA never opens a payment window or submits any new orders.
   if(req.method!=='GET'){res.writeHead(403);res.end('Visual QA is read only');return;}
   const r=await localWorker.fetch(new Request(localOrigin+req.url,{headers:req.headers}),{...env,SITE_ORIGIN:localOrigin},{});
   res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));
  }catch{res.writeHead(500);res.end('Local visual fixture failed');}
 }).listen(5196,'127.0.0.1',()=>console.log('Admin UI fixture: '+localOrigin+'/__admin'));
}
