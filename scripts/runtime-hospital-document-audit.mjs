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
const objects=new Map();
env.BACKUPS={
 async put(key,value,opts={}){objects.set(key,{key,value,...opts,uploaded:new Date()});},
 async get(key){const o=objects.get(key);return o?{...o,body:o.value,text:async()=>String(o.value)}:null;},
 async list(opts={}){return{objects:[...objects.values()].filter(o=>o.key.startsWith(opts.prefix||'')),truncated:false};},
 async delete(keys){for(const k of Array.isArray(keys)?keys:[keys])objects.delete(k);}
};
for(const role of ['doctor','hospital','admin']) {const r=await call('/api/auth/test-switch','',{key:role});cookies[role]=r.cookie;record('fresh session '+role,r.status,200);}
const base={role:'hospital',email:'certificate@example.invalid',password:'Audit-document-2026!',displayName:'가상 담당자',phone:'01000000000',hospitalName:'서류 검수 가상 병원',representativeName:'가상 대표',businessNumber:'0000000000',address:'부산 검수용 주소',termsAccepted:true,privacyAcknowledged:true,ageConfirmed:true,privacyVersion:PRIVACY_FORM_VERSION};
async function register(overrides={}) {
 const form=new FormData();form.append('payload',JSON.stringify({...base,...overrides}));form.append('businessDocument',new Blob(['%PDF-1.4\nSynthetic audit only'],{type:'application/pdf'}),'synthetic.pdf');
 const response=await worker.fetch(new Request('https://audit.local/api/auth/register',{method:'POST',headers:{origin:'https://audit.local'},body:form}),env,{});
 return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
const before=count('accounts');
for(const value of [undefined,false,'true',1])record('reject non-consent '+String(value),(await register({hospitalDocumentConsent:value})).status,400);
record('no account without consent',count('accounts'),before);
record('no file without consent',objects.size,0);
record('reject old notice',(await register({hospitalDocumentConsent:true,privacyVersion:'privacy-forms-v1.1-2026-09-12'})).status,400);
const registered=await register({hospitalDocumentConsent:true});cookies.newHospital=registered.cookie;
record('consented hospital signup',registered.status,201);
record('signup issues session',Boolean(registered.cookie),true);
const h=one('SELECT * FROM hospital_verification_requests ORDER BY rowid DESC LIMIT 1');
record('dedicated consent stored',one("SELECT COUNT(*) n FROM processing_consent_events WHERE scope='hospitalDocument' AND resource_id=? AND document_version=?",h.id,PRIVACY_FORM_VERSION).n,1);
record('notice snapshot restricted to verification',JSON.parse(one("SELECT notice_json p FROM processing_consent_events WHERE scope='hospitalDocument' AND resource_id=?",h.id).p).purpose.includes('다른 용도로 사용하지 않습니다'),true);
record('retention is 30 days',one('SELECT ROUND(julianday(retention_until)-julianday(submitted_at)) days FROM hospital_verification_requests WHERE id=?',h.id).days,30);
record('upload alone has no checked timestamp',h.reviewed_at,null);
record('hospital session works',(await call('/api/member-center','newHospital')).status,200);
const path=id=>'/api/admin-hospital-verifications/'+id;
async function documentStatus(id,role=''){return(await worker.fetch(new Request('https://audit.local'+path(id)+'/document',{headers:{cookie:cookies[role]||''}}),env,{})).status;}
for(const role of ['','doctor','hospital','newHospital','admin'])record('private document '+(role||'anonymous'),await documentStatus(h.id,role),role==='admin'?200:403);
for(const role of ['','doctor','hospital','newHospital'])record('completion denied '+(role||'anonymous'),(await call(path(h.id)+'/complete',role,{confirmed:true})).status,403);
record('completion needs explicit true',(await call(path(h.id)+'/complete','admin',{confirmed:'true'})).status,400);
record('cross-origin completion denied',(await worker.fetch(new Request('https://audit.local'+path(h.id)+'/complete',{method:'POST',headers:{cookie:cookies.admin,origin:'https://other.invalid','content-type':'application/json'},body:JSON.stringify({confirmed:true})}),env,{})).status,403);
record('rejected completion preserves file',objects.has(h.document_key),true);
record('admin checks and purges',(await call(path(h.id)+'/complete','admin',{confirmed:true})).status,200);
record('original file deleted',objects.has(h.document_key),false);
record('file metadata removed',!!one('SELECT id FROM hospital_verification_requests WHERE id=?',h.id),false);
record('deleted URL unavailable',await documentStatus(h.id,'admin'),404);
const account=(await call('/api/account','newHospital')).data;
record('hospital autofill survives deletion',account.hospitalProfile?.hospitalName,base.hospitalName);
record('business number survives deletion',account.hospitalProfile?.businessNumber,base.businessNumber);
record('separate checked status',account.hospitalProfile?.verificationStatus,'checked');
record('checked time recorded',Boolean(account.registrationProfile?.hospitalDocument?.checkedAt),true);
record('admin status survives reload',(await call('/api/admin-console','admin')).data.members.find(x=>x.id===h.account_id)?.hospitalDocumentStatus,'checked');
record('login survives deletion',(await call('/api/auth/login','',{email:base.email,password:base.password})).status,200);
record('completion is retry safe',(await call(path(h.id)+'/complete','admin',{confirmed:true})).status,200);
record('one deletion audit',one("SELECT COUNT(*) n FROM admin_audit_logs WHERE action='hospital_document_deleted' AND subject=?",h.id).n,1);

// Consent and account/file writes must succeed together.
const realBatch=DB.batch;
DB.batch=async statements=>{if(statements.some(s=>s.sql.includes('INSERT INTO processing_consent_events')&&s.args.includes('hospitalDocument')))throw new Error('TEST_CONSENT_WRITE_FAILED');return realBatch(statements);};
const failed=await register({email:'failed-certificate@example.invalid',hospitalDocumentConsent:true});
DB.batch=realBatch;
record('consent storage failure rejects signup',failed.status,409);
record('failed signup leaves no credential',!!one('SELECT account_id FROM auth_credentials WHERE email_normalized=?','failed-certificate@example.invalid'),false);
record('failed signup removes uploaded file',objects.size,0);

async function nextDocument(label){const r=await register({email:label+'@example.invalid',hospitalDocumentConsent:true});cookies[label]=r.cookie;record(label+' signup',r.status,201);return one('SELECT * FROM hospital_verification_requests ORDER BY rowid DESC LIMIT 1');}
const expired=await nextDocument('expired');
sqlite.prepare("UPDATE hospital_verification_requests SET retention_until=datetime('now','-1 day') WHERE id=?").run(expired.id);
record('expired URL returns 410',await documentStatus(expired.id,'admin'),410);
record('expired file purged',objects.has(expired.document_key),false);
record('expired does not imply checked',(await call('/api/account','expired')).data.registrationProfile.hospitalDocument.status,'expired');
record('expired profile still usable',(await call('/api/account','expired')).data.hospitalProfile.hospitalName,base.hospitalName);

const retry=await nextDocument('storage-retry'), realDelete=env.BACKUPS.delete;
env.BACKUPS.delete=async()=>{throw new Error('TEST_R2_DELETE_FAILED');};
record('storage failure reported',(await call(path(retry.id)+'/complete','admin',{confirmed:true})).status,503);
record('failed deletion retains retry record',!!one('SELECT id FROM hospital_verification_requests WHERE id=?',retry.id),true);
record('failed deletion stops original access',await documentStatus(retry.id,'admin'),503);
env.BACKUPS.delete=realDelete;
record('storage retry completes',(await call(path(retry.id)+'/complete','admin',{confirmed:true})).status,200);
record('storage retry removes original',objects.has(retry.document_key),false);

const dbRetry=await nextDocument('database-retry');
DB.batch=async statements=>{if(statements.some(s=>s.sql.startsWith('DELETE FROM hospital_verification_requests')))throw new Error('TEST_AFTER_R2_DELETE');return realBatch(statements);};
record('post-delete DB failure reported',(await call(path(dbRetry.id)+'/complete','admin',{confirmed:true})).status,503);
DB.batch=realBatch;
record('file already removed before DB failure',objects.has(dbRetry.document_key),false);
record('DB failure retry completes',(await call(path(dbRetry.id)+'/complete','admin',{confirmed:true})).status,200);
record('DB retry records result',(await call('/api/account','database-retry')).data.registrationProfile.hospitalDocument.status,'checked');

const withdrawn=await nextDocument('withdrawn');
record('withdraw hospital',(await call('/api/account','withdrawn',undefined,'DELETE')).status,200);
record('withdrawal removes unexpired original',objects.has(withdrawn.document_key),false);
record('withdrawal removes verification result',!!one('SELECT account_id FROM member_registration_profiles WHERE account_id=?',withdrawn.account_id),false);
record('withdrawal removes consent',one('SELECT COUNT(*) n FROM processing_consent_events WHERE account_id=?',withdrawn.account_id).n,0);
record('admin unrelated mutations still disabled',(await call('/api/admin-console','admin',{action:'member_update'},'PATCH')).status,405);
console.log(JSON.stringify({checks:output.length,failed:output.filter(x=>!x.pass),results:output},null,2));
if(output.some(x=>!x.pass))process.exitCode=1;
