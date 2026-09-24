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
// D1 executes a batch without interleaving another request's transaction.
DB.batch=async statements=>{sqlite.exec('BEGIN');try{const result=statements.map(s=>{const stmt=sqlite.prepare(s.sql);if(/^\s*(SELECT|PRAGMA)/i.test(s.sql))return {results:stmt.all(...s.args),success:true};const r=stmt.run(...s.args);return{success:true,meta:{changes:Number(r.changes)}};});sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');sqlErrors.push(e.message);throw e;}};
const env={DB,ACCOUNT_HASH_SECRET:'audit-only-secret-never-used-outside-local-20260909',ADMIN_EMAILS:'admin@medihelpers.co.kr',SIGNUP_ENABLED:'true',LEGAL_DOCUMENT_STATUS:'approved',TEST_ACCOUNT_SWITCH_ENABLED:'true'};
const output=[];
async function call(path,role='',body,method=body?'POST':'GET') {
 // Every scenario supplies its own consent fields; this helper never adds consent.
 const headers={'content-type':'application/json',origin:'https://audit.local'};if(cookies[role])headers.cookie=cookies[role];
 const response=await worker.fetch(new Request('https://audit.local'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})}),env,{});
 let data;try{data=await response.json();}catch{data={};}
 return {status:response.status,data,cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
const cookies={};
function record(name,actual,expected){output.push({name,pass:actual===expected,actual,expected});}
const consent={privacyVersion:PRIVACY_FORM_VERSION,privacyConsent:true};
const one=(sql,...args)=>sqlite.prepare(sql).get(...args);
const count=t=>one('SELECT COUNT(*) n FROM '+t).n;
for (const role of ['doctor', 'hospital', 'admin']) {
  const r = await call('/api/auth/test-switch', '', { key: role });
  cookies[role] = r.cookie;
  record('fresh ' + role + ' session', r.status, 200);
}
// Account bootstrap probes optional tables before the existing lazy migrations.
// Cold-start migration coverage lives in runtime-integration-audit; this suite
// isolates purchase and detail behavior after the account/admin schemas exist.
await call('/api/member-center', 'hospital');
await call('/api/admin-console', 'admin');
sqlErrors.length = 0;
const signup={...consent,optionalPrivacyConsent:true,email:'flow-owner@example.invalid',password:'Local-flow-2026!',role:'doctor',displayName:'가상 흐름회원',phone:'01000000000',professionType:'한의사',specialty:'한의학',region:'서울',termsAccepted:true,privacyAcknowledged:true,ageConfirmed:true};
const registered=await call('/api/auth/register','',signup);cookies.owner=registered.cookie;
record('register real-shaped fixture',registered.status,201);
record('immutable signup identity',(await call('/api/member-center','owner',{profile:{displayName:'변조'},notifications:{}},'PATCH')).status,403);
record('notification preferences remain editable',(await call('/api/member-center','owner',{notifications:{email:false}},'PATCH')).status,200);
const resumeInput={...consent,createNew:true,title:'가상 이력서',name:'변조 성명',phone:'01999999999',email:'spoof@example.invalid',profession:'한의사',specialty:'한의학',desiredRegions:'서울',detail:{introduction:'경력과 전문분야를 충분히 설명하는 가상 테스트 이력서입니다. 주 5일 서울 근무를 희망합니다.'}};
const saved=await call('/api/resumes','owner',resumeInput),saved2=await call('/api/resumes','owner',{...resumeInput,title:'두 번째 이력서'});
record('new resume added',saved2.status,201);record('two distinct IDs',saved.data.id!==saved2.data.id,true);
const resumes=(await call('/api/resumes','owner')).data.resumes;
record('resume uses signup name',resumes[0].name,signup.displayName);record('resume uses signup email',resumes[0].email,signup.email);record('resume uses signup phone',resumes[0].phone,'010-0000-0000');
const spoofProfession=await call('/api/resumes','owner',{...resumeInput,profession:'의사'});
record('signup profession cannot be forged',one('SELECT profession FROM resumes WHERE id=?',spoofProfession.data.id).profession,'한의사');
const weak=await call('/api/resumes','owner',{...resumeInput,title:'미완성 초안',detail:{introduction:''}});
record('draft may be saved',weak.status,201);
const postInput={...consent,publicationAcknowledged:true,resumeId:saved.data.id,title:'첫 구직글',contactVisibility:'private'};
record('thin resume cannot publish',(await call('/api/job-seeker-posts','owner',{...postInput,resumeId:weak.data.id})).status,400);
const first=await call('/api/job-seeker-posts','owner',postInput),second=await call('/api/job-seeker-posts','owner',{...postInput,title:'두 번째 구직글'});
record('independent posts from same resume',second.status,201);record('posts have distinct IDs',first.data.post.id!==second.data.post.id,true);
sqlite.prepare("UPDATE job_seeker_posts SET created_at='2026-01-01 00:00:00' WHERE id=?").run(first.data.post.id);
sqlite.prepare("UPDATE job_seeker_posts SET created_at='2026-02-01 00:00:00' WHERE id=?").run(second.data.post.id);
await call('/api/job-seeker-posts/'+first.data.post.id,'owner',{...postInput,title:'수정 첫 구직글'},'PATCH');
const published=(await call('/api/site-operations')).data.contents.filter(item=>item.id.startsWith('seeker-'));
record('edit does not bump order',published[0]?.id,'seeker-'+second.data.post.id);
record('original publication date unchanged',one('SELECT created_at d FROM job_seeker_posts WHERE id=?',first.data.post.id).d,'2026-01-01 00:00:00');
const orderInput={...consent,checkoutAcknowledged:true,productId:'basic',metadata:{hospital:'위조 병원',title:'재노출 테스트',department:'한의사',address:'서울',banner:'/banners/templates/medical-blue-v1.jpg',representative:'위조 대표자',businessNumber:'1234567890'}};
const order=(await call('/api/payment-orders','hospital',orderInput)).data.order;
await call('/api/payment-approve','hospital',{orderNumber:order.orderNumber});
record('registered hospital used',one('SELECT subtitle s FROM admin_content_records WHERE id=?',order.contentRecordId).s,'메디헬퍼스 테스트병원');
record('business identity cannot be forged',JSON.parse(one('SELECT metadata_json m FROM payment_orders WHERE id=?',order.id).m).businessNumber,'');
const renewal={...consent,checkoutAcknowledged:true,productId:'basic',renewContentId:order.contentRecordId};
record('active ad cannot renew',(await call('/api/payment-orders','hospital',renewal)).status,409);
record('non-owner cannot renew',(await call('/api/payment-orders','owner',renewal)).status,403);
sqlite.prepare("UPDATE admin_content_records SET payload_json=json_set(payload_json,'$.exposure',NULL,'$.exposureEnd','2000-01-01') WHERE id=?").run(order.contentRecordId);
const renewed=await call('/api/payment-orders','hospital',renewal);
record('expired ad can renew',renewed.status,201);record('same ad record retained',renewed.data.order?.contentRecordId,order.contentRecordId);
record('pending renewal protected',(await call('/api/payment-orders','hospital',renewal)).status,409);
record('renewal approval',(await call('/api/payment-approve','hospital',{orderNumber:renewed.data.order.orderNumber})).data.approved,true);
record('renewal retains banner',JSON.parse(one('SELECT payload_json p FROM admin_content_records WHERE id=?',order.contentRecordId).p).banner,orderInput.metadata.banner);
record('renewal visible',(await call('/api/site-operations')).data.contents.some(item=>item.id===order.contentRecordId),true);
async function refundOrder(order){
 await call('/api/member-center','hospital',{action:'refund_request',orderNumber:order.orderNumber,reason:'합성 환불 시험'});
 return one("SELECT id FROM payment_refunds WHERE order_id=? AND status='requested'",order.id).id;
}
const refundId=await refundOrder(renewed.data.order);
record('non-admin refund denied',(await call('/api/admin-refund-review','hospital',{refundId,decision:'approve'})).status,403);
env.PAYMENT_LIVE='true';record('live refund cannot falsely succeed',(await call('/api/admin-refund-review','admin',{refundId,decision:'approve'})).status,503);delete env.PAYMENT_LIVE;
// Old expired order must not keep the renewed ad visible after refund.
sqlite.prepare("UPDATE payment_orders SET metadata_json=json_set(metadata_json,'$.exposure.end','2000-01-01') WHERE id=?").run(order.id);
record('virtual ad refund',(await call('/api/admin-refund-review','admin',{refundId,decision:'approve'})).data.refunded,true);
record('refunded ad removed',(await call('/api/site-operations')).data.contents.some(item=>item.id===order.contentRecordId),false);
record('repeat refund rejected',(await call('/api/admin-refund-review','admin',{refundId,decision:'approve'})).status,409);
const pack=(await call('/api/payment-orders','hospital',{...consent,checkoutAcknowledged:true,productId:'talent-unlock-pack'})).data.order;
await call('/api/payment-approve','hospital',{orderNumber:pack.orderNumber});
await call('/api/talent-detail/seeker-'+first.data.post.id,'hospital');
const packRefund=await refundOrder(pack);
record('virtual ticket refund',(await call('/api/admin-refund-review','admin',{refundId:packRefund,decision:'approve'})).data.refunded,true);
record('ticket access revoked',(await call('/api/talent-detail/seeker-'+first.data.post.id,'hospital')).data.unlocked,false);
record('remaining credits revoked',one('SELECT SUM(total_credits-used_credits) n FROM talent_credit_pools WHERE order_id=?',pack.id).n,0);
// Audit regressions: published content remains meaningful and concurrent renewal is unique.
const hollow=await call('/api/resumes','owner',{...resumeInput,createNew:false,resumeId:saved.data.id,detail:{introduction:''}});
record('published resume cannot be emptied',hollow.status,400);
await call('/api/resumes','owner',{...resumeInput,createNew:false,resumeId:saved.data.id});
sqlite.prepare("UPDATE admin_content_records SET payload_json=json_set(payload_json,'$.exposure',NULL,'$.exposureEnd','2000-01-01') WHERE id=?").run(order.contentRecordId);
const originalFirst=Statement.prototype.first;let pendingReaders=0,releasePending;const pendingGate=new Promise(resolve=>{releasePending=resolve;});
Statement.prototype.first=async function(column){const result=await originalFirst.call(this,column);if(this.sql.includes("status IN ('pending_review','awaiting_payment')") && this.sql.includes('renewalContentId')){if(++pendingReaders===2)releasePending();await pendingGate;}return result;};
const simultaneous=await Promise.all([call('/api/payment-orders','hospital',renewal),call('/api/payment-orders','hospital',renewal)]);
Statement.prototype.first=originalFirst;
record('one concurrent renewal succeeds',simultaneous.filter(r=>r.status===201).length,1);
record('second concurrent renewal recovers same order',simultaneous.filter(r=>r.status===409 && r.data.recoveryOrder?.orderNumber).length,1);
const latestOrder=simultaneous.find(r=>r.status===201).data.order;
const centerOrders=(await call('/api/member-center','hospital')).data.orders;
record('newest same-second renewal appears first',centerOrders.find(r=>r.contentRecordId===order.contentRecordId).orderNumber,latestOrder.orderNumber);
record('pending renewal identifiable for recovery',centerOrders.find(r=>r.orderNumber===latestOrder.orderNumber).isRenewal,true);
const newPassword='Changed-flow-2026!';
record('wrong current password denied',(await call('/api/auth/change-password','owner',{currentPassword:'wrong',password:newPassword})).status,400);
record('valid password change',(await call('/api/auth/change-password','owner',{currentPassword:signup.password,password:newPassword})).data.changed,true);
record('old session revoked',(await call('/api/resumes','owner')).status,401);
record('old password no longer logs in',(await call('/api/auth/login','',{email:signup.email,password:signup.password})).status,401);
record('new password logs in',(await call('/api/auth/login','',{email:signup.email,password:newPassword})).status,200);
console.log(JSON.stringify({checks:output.length,failed:output.filter(item=>!item.pass),results:output},null,2));
if(output.some(item=>!item.pass))process.exitCode=1;

if(process.argv.includes('--serve') && !process.exitCode) {
 const {createServer}=await import('node:http');
 createServer(async(req,res)=>{
  try {
   const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);
   const response=await worker.fetch(new Request('http://127.0.0.1:5195'+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{})}),env,{});
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(500);res.end('Local fixture error');}
 }).listen(5195,'127.0.0.1',()=>console.log(JSON.stringify({preview:'http://127.0.0.1:5195/jobs/admin-'+order.contentRecordId})));
}
