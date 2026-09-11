import { PRIVACY_FORM_VERSION } from '../src/privacyConsent.js';
// Run after npm run build. Exercises the generated Worker with an isolated in-memory SQLite DB.
import { DatabaseSync } from 'node:sqlite';
import { readFile, readdir } from 'node:fs/promises';
import worker from '../dist/server/index.js';

const sqlite = new DatabaseSync(':memory:');
for(const file of (await readdir(new URL('../drizzle/',import.meta.url))).filter(x=>x.endsWith('.sql')).sort()) sqlite.exec(await readFile(new URL('../drizzle/'+file,import.meta.url),'utf8'));
const sqlErrors=[];
class Statement {
  constructor(sql,args=[]) { this.sql=sql; this.args=args; }
  bind(...args) { return new Statement(this.sql,args); }
  async all() { try { return {results:sqlite.prepare(this.sql).all(...this.args),success:true}; } catch(e) {sqlErrors.push(e.message); throw e;} }
  async first(column) { const row=(await this.all()).results[0]||null; return column ? row?.[column] : row; }
  async run() { try {const r=sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}};}catch(e){sqlErrors.push(e.message);throw e;} }
}
const DB={prepare:sql=>new Statement(sql),batch:async statements=>{sqlite.exec('BEGIN');try{const results=[];for(const s of statements){if(/^\s*(SELECT|PRAGMA)/i.test(s.sql))results.push(await s.all());else results.push(await s.run());}sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}},exec:async sql=>sqlite.exec(sql)};
const env={DB,ACCOUNT_HASH_SECRET:'audit-only-secret-never-used-outside-local-20260909',ADMIN_EMAILS:'admin@medihelpers.co.kr',SIGNUP_ENABLED:'true',LEGAL_DOCUMENT_STATUS:'approved',TEST_ACCOUNT_SWITCH_ENABLED:'true'};
const output=[];
async function call(path,role='',body,method=body?'POST':'GET') {
 // Existing positive fixtures explicitly represent a visitor accepting the current notices.
 // Negative consent cases override these values with false/null.
 if(body && typeof body === 'object' && !Array.isArray(body)) body={privacyVersion:PRIVACY_FORM_VERSION,privacyConsent:true,publicationAcknowledged:true,checkoutAcknowledged:true,contactConsent:true,...body};
 const headers={'content-type':'application/json',origin:'https://audit.local'};if(cookies[role])headers.cookie=cookies[role];
 const response=await worker.fetch(new Request('https://audit.local'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})}),env,{});
 let data;try{data=await response.json();}catch{data={};}
 return {status:response.status,data,cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
const cookies={};
function record(name,actual,expected){output.push({name,pass:actual===expected,actual,expected});}
for(const role of ['doctor','hospital','admin']){const r=await call('/api/auth/test-switch','',{key:role});cookies[role]=r.cookie;record('local login '+role,r.status,200);}
for(const role of ['', 'doctor','hospital','admin']) for(const path of ['/api/account','/api/resumes','/api/member-center','/api/admin-console','/api/recruitment-crm','/api/payment-orders','/api/job-seeker-posts']) {const r=await call(path,role);output.push({name:'role matrix '+(role||'anonymous')+' '+path,status:r.status}); if(role==='hospital' && path==='/api/member-center') record('cold hospital member center',r.status,200);}
const resume=await call('/api/resumes','doctor',{title:'검수 이력서',name:'검수의사',phone:'010-0000-0000',profession:'의사',specialty:'내과',detail:{introduction:'검수 전용',contactVisibility:'ticket'},createNew:true});record('save resume',resume.status,201);
const post=await call('/api/job-seeker-posts','doctor',{resumeId:resume.data.id,title:'검수 구직글',contactVisibility:'private'});record('create post',post.status,201);
const duplicate=await call('/api/job-seeker-posts','doctor',{resumeId:resume.data.id,title:'duplicate'});record('duplicate post rejected',duplicate.status,409);
const order=await call('/api/payment-orders','hospital',{productId:'talent-unlock-pack'});record('create credit order',order.status,201);
const approve=await call('/api/payment-approve','hospital',{orderNumber:order.data.order.orderNumber});record('approve virtual pack',approve.data.approved,true);
await call('/api/payment-approve','hospital',{orderNumber:order.data.order.orderNumber});
record('repeat approval only 10 credits',sqlite.prepare('SELECT SUM(total_credits) n FROM talent_credit_pools').get().n,10);
let detail=await call('/api/talent-detail/seeker-'+post.data.post.id,'hospital');record('unlock active private-contact post',detail.status,200);record('private contact protected',detail.data.detail?.phone,'');
record('first view costs one',sqlite.prepare('SELECT SUM(used_credits) n FROM talent_credit_pools').get().n,1);
await call('/api/talent-detail/seeker-'+post.data.post.id,'hospital');record('repeat view no extra cost',sqlite.prepare('SELECT SUM(used_credits) n FROM talent_credit_pools').get().n,1);
const doctorAccount=sqlite.prepare("SELECT account_id FROM auth_credentials WHERE email_normalized='doctor-test@medihelpers.co.kr'").get().account_id;
env.UPLOADS={get:async()=>({httpMetadata:{contentType:'image/png'},body:new Uint8Array([137,80,78,71])})};
const photo=await call('/api/uploads/profiles/'+doctorAccount+'/audit.png','hospital');record('ticket holder can view linked resume photo',photo.status,200);
const originalSource=await readFile(new URL('../scripts/package-sites.mjs',import.meta.url),'utf8');
const cleanupSql=originalSource.match(/env\.DB\.prepare\("(DELETE FROM talent_unlocks WHERE order_id<>''[^"\n]+)"\)/)[1];
const poolId=sqlite.prepare('SELECT id FROM talent_credit_pools LIMIT 1').get().id; sqlite.prepare('UPDATE talent_unlocks SET order_id=?').run(poolId);
const cleanup=sqlite.prepare(cleanupSql).run();record('retention preserves valid pack unlocks',Number(cleanup.changes),0);
await call('/api/talent-detail/seeker-'+post.data.post.id,'hospital');record('revisit after retention must remain one credit',sqlite.prepare('SELECT SUM(used_credits) n FROM talent_credit_pools').get().n,1);
const beforeMissing=sqlite.prepare('SELECT SUM(used_credits) n FROM talent_credit_pools').get().n;
detail=await call('/api/talent-detail/seeker-NONEXISTENT-AUDIT','hospital');
record('nonexistent talent must not consume credit',sqlite.prepare('SELECT SUM(used_credits) n FROM talent_credit_pools').get().n,beforeMissing);
output.push({name:'nonexistent talent response',status:detail.status,data:detail.data});
record('missing target order rejected',(await call('/api/payment-orders','hospital',{productId:'talent-unlock-single',metadata:{talentId:'seeker-NONEXISTENT'}})).status,400);
const secondResume=await call('/api/resumes','doctor',{title:'limit test',name:'Test',phone:'010-0000-0000',profession:'의사',createNew:true});
const secondPost=await call('/api/job-seeker-posts','doctor',{resumeId:secondResume.data.id,title:'limit test'});
env.TALENT_VIEW_DAILY_LIMIT='1';
const beforeLimit=sqlite.prepare('SELECT SUM(used_credits) n FROM talent_credit_pools').get().n;
record('daily limit blocks before debit',(await call('/api/talent-detail/seeker-'+secondPost.data.post.id,'hospital')).status,429);
record('daily limit preserves credit',sqlite.prepare('SELECT SUM(used_credits) n FROM talent_credit_pools').get().n,beforeLimit);
delete env.TALENT_VIEW_DAILY_LIMIT;
const single=await call('/api/payment-orders','hospital',{productId:'talent-unlock-single'});
const singlePaid=await call('/api/payment-approve','hospital',{orderNumber:single.data.order.orderNumber});
output.push({name:'single without talent target',orderStatus:single.status,approved:singlePaid.data.approved,entitlements:sqlite.prepare('SELECT COUNT(*) n FROM talent_unlocks WHERE order_id=?').get(single.data.order.id).n,credits:sqlite.prepare('SELECT COUNT(*) n FROM talent_credit_pools WHERE order_id=?').get(single.data.order.id).n});
record('untargeted single grants exactly one credit',sqlite.prepare('SELECT total_credits n FROM talent_credit_pools WHERE order_id=?').get(single.data.order.id)?.n,1);
const ad=await call('/api/payment-orders','hospital',{productId:'basic',metadata:{hospital:'검수병원',department:'내과',address:'서울',introduction:'검수 전용'}});
record('ad draft before approval',sqlite.prepare('SELECT status FROM admin_content_records WHERE id=?').get(ad.data.order.contentRecordId)?.status,'draft');
await call('/api/payment-approve','hospital',{orderNumber:ad.data.order.orderNumber});
record('ad published after approval',sqlite.prepare('SELECT status FROM admin_content_records WHERE id=?').get(ad.data.order.contentRecordId)?.status,'published');
const adBefore=sqlite.prepare('SELECT COUNT(*) n FROM admin_content_records').get().n;
await call('/api/payment-approve','hospital',{orderNumber:ad.data.order.orderNumber});record('repeat approval no duplicate ad',sqlite.prepare('SELECT COUNT(*) n FROM admin_content_records').get().n,adBefore);
record('doctor cannot buy ad',(await call('/api/payment-orders','doctor',{productId:'basic'})).status,403);
record('wrong owner cannot approve',(await call('/api/payment-approve','doctor',{orderNumber:ad.data.order.orderNumber})).status,403);
await call('/api/job-seeker-posts/'+post.data.post.id,'doctor',null,'DELETE');
const beforeDeleted=sqlite.prepare('SELECT SUM(used_credits) n FROM talent_credit_pools').get().n;
detail=await call('/api/talent-detail/seeker-'+post.data.post.id,'hospital');record('deleted post detail absent',detail.data.detail,null);
record('deleted target preserves credit',sqlite.prepare('SELECT SUM(used_credits) n FROM talent_credit_pools').get().n,beforeDeleted);
record('deleted post photo denied',(await call('/api/uploads/profiles/'+doctorAccount+'/audit.png','hospital')).status,403);
const payload={name:'검수의사',hospital:'검수병원',phone:'010-0000-0000',specialty:'내과',message:'로컬 검수 전용',resumeId:resume.data.id};
const consultation=await call('/api/consultations','doctor',{requestType:'doctor',payload});record('doctor consultation saved locally',consultation.status,201);
const application=await call('/api/consultations','doctor',{requestType:'doctor',thirdPartyConsent:true,recipient:'검수병원',payload:{...payload,jobId:'admin-'+ad.data.order.contentRecordId}});
record('direct application to paid job saved',application.status,201);
const hospitalCenter=await call('/api/member-center','hospital');
record('hospital sees direct applicant',JSON.stringify(hospitalCenter.data).includes(resume.data.id),true);
record('wrong consultation role rejected',(await call('/api/consultations','hospital',{requestType:'doctor',payload})).status,403);
record('static fixture direct application rejected',(await call('/api/consultations','doctor',{requestType:'doctor',payload:{...payload,jobId:'seoul-wellness'}})).status,409);
const refund=await call('/api/admin-console','admin',{action:'refund_create',payload:{orderId:order.data.order.id,amount:29000,reason:'local audit'}},'PATCH');record('current read-only admin blocks refund',refund.status,405);
output.push({name:'refund operational limitation',status:refund.status,error:refund.data.error});
console.log(JSON.stringify({checks:output,sqlErrors},null,2));
if(output.some(r=>r.pass===false))process.exitCode=1;
