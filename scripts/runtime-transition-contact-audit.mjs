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
await call('/api/member-center','doctor');
await call('/api/admin-console','admin');
const resume=(await call('/api/resumes','doctor',{...consent,createNew:true,title:'연락처 테스트',profession:'의사',specialty:'내과',desiredRegions:'서울',detail:{introduction:'구직글 연락처 수정과 공개 범위를 검증하기 위한 가상 이력서입니다. 서울에서 근무를 희망합니다.'}})).data;
const input={...consent,publicationAcknowledged:true,resumeId:resume.id,title:'가상 연락처',contactVisibility:'ticket',contactConsent:true,contactPhone:'01012345678',additionalContactPhone:'0212345678'};
const created=await call('/api/job-seeker-posts','doctor',input);
record('post created with two phones',created.status,201);
const id=created.data.post?.id;
const own=await call('/api/job-seeker-posts/'+id,'doctor');
record('editable primary persisted',own.data.post?.contactPhone,'010-1234-5678');
record('additional persisted',own.data.post?.additionalContactPhone,'02-1234-5678');
const registrationPhone=one('SELECT phone FROM resumes WHERE id=?',resume.id).phone;
record('account resume contact unchanged',registrationPhone!=='010-1234-5678',true);
record('invalid contact rejected',(await call('/api/job-seeker-posts/'+id,'doctor',{...input,contactPhone:'bad'},'PATCH')).status,400);
record('contact disclosure requires consent',(await call('/api/job-seeker-posts/'+id,'doctor',{...input,contactConsent:false},'PATCH')).status,400);
record('other role cannot update',(await call('/api/job-seeker-posts/'+id,'hospital',input,'PATCH')).status,403);
const publicBody=JSON.stringify((await call('/api/site-operations')).data);
record('public list contains neither number',!publicBody.includes('010-1234-5678')&&!publicBody.includes('02-1234-5678'),true);
const talentPath='/api/talent-detail/seeker-'+id;
record('locked visitor sees no phones',!JSON.stringify((await call(talentPath,'hospital')).data).includes('010-1234-5678'),true);
const ownerDetail=await call(talentPath,'doctor');
record('owner sees chosen contact',ownerDetail.data.detail?.phone,'010-1234-5678');
record('owner sees additional contact',ownerDetail.data.detail?.additionalContactPhone,'02-1234-5678');
// A real-shaped virtual purchase verifies the existing entitlement boundary.
const purchase=await call('/api/payment-orders','hospital',{...consent,checkoutAcknowledged:true,productId:'talent-unlock-single',targetId:'seeker-'+id,contactVisibilityAtCheckout:'ticket'});
record('virtual unlock order',purchase.status,201);
const orderNumber=purchase.data.order?.orderNumber;
record('virtual unlock approval',(await call('/api/payment-approve','hospital',{orderNumber})).data.approved,true);
record('purchaser sees selected contact',(await call(talentPath,'hospital')).data.detail?.phone,'010-1234-5678');
await call('/api/job-seeker-posts/'+id,'doctor',{...input,contactPhone:'01022223333',additionalContactPhone:''},'PATCH');
record('purchaser sees updated number',(await call(talentPath,'hospital')).data.detail?.phone,'010-2222-3333');
record('additional number can be removed',(await call(talentPath,'hospital')).data.detail?.additionalContactPhone,'');
await call('/api/job-seeker-posts/'+id,'doctor',{...input,contactVisibility:'private',contactConsent:false},'PATCH');
const protectedDetail=await call(talentPath,'hospital');
record('privacy change hides both purchased phones',protectedDetail.data.detail?.phone===''&&protectedDetail.data.detail?.additionalContactPhone==='',true);
record('post retains private contact for owner',(await call('/api/job-seeker-posts/'+id,'doctor')).data.post?.contactPhone,'010-1234-5678');
// Global freeze must precede storage initialization and request-triggered cleanup.
let touches=0;
const poison=new Proxy({}, {get(){touches++;throw new Error('storage touched during freeze');}});
for(const mode of ['drain','frozen']) {
  for(const [path,method] of [['/api/resumes','GET'],['/api/talent-detail/x','GET'],['/api/payment-orders','POST'],['/api/admin-console','POST'],['/api/auth/login','POST'],['/api/uploads/x.png','GET'],['/','GET']]) {
    const r=await worker.fetch(new Request('https://audit.local'+path,{method}),{MIGRATION_MODE:mode,DB:poison,BACKUPS:poison},{waitUntil(){touches++;}});
    record(mode+' '+method+' '+path,r.status,503);
  }
}
record('freeze makes no storage or background accesses',touches,0);
env.CHECKOUT_ENABLED='false';
record('checkout pause rejects new order',(await call('/api/payment-orders','hospital',{productId:'basic'})).status,503);
record('checkout pause preserves owner read',(await call('/api/job-seeker-posts/'+id,'doctor')).status,200);
env.MIGRATION_MODE='drain';
record('drain retains approval validation',(await call('/api/payment-approve','hospital',{orderNumber:'missing'})).status,404);
env.MIGRATION_MODE='frozen';
record('frozen rejects approval',(await call('/api/payment-approve','hospital',{orderNumber})).status,503);
delete env.MIGRATION_MODE;delete env.CHECKOUT_ENABLED;
record('reopen restores read',(await call('/api/job-seeker-posts/'+id,'doctor')).status,200);
console.log(JSON.stringify({passed:output.filter(x=>x.pass).length,total:output.length,failures:output.filter(x=>!x.pass)},null,2));
if(output.some(x=>!x.pass))process.exitCode=1;
