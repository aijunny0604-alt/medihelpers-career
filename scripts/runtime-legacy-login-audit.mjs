import { DatabaseSync } from 'node:sqlite';
import { readFile, readdir } from 'node:fs/promises';
import { pbkdf2Sync,createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';
const sqlite = new DatabaseSync(':memory:');
sqlite.exec('PRAGMA foreign_keys=ON');
for (const file of (await readdir(new URL('../drizzle/',import.meta.url))).filter(x=>x.endsWith('.sql')).sort()) sqlite.exec(await readFile(new URL('../drizzle/'+file,import.meta.url),'utf8'));
class Statement {
  constructor(sql,args=[]) {this.sql=sql;this.args=args;}
  bind(...args) {return new Statement(this.sql,args.map(v=>v instanceof ArrayBuffer?new Uint8Array(v):v));}
  async all() {return {results:sqlite.prepare(this.sql).all(...this.args),success:true};}
  async first(column) {const row=(await this.all()).results[0]||null;return column?row?.[column]:row;}
  async run() {const r=sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(r.changes)}};}
}
const DB={prepare:sql=>new Statement(sql),batch:async statements=>{
  sqlite.exec('BEGIN');try{const results=statements.map(s=>{const stmt=sqlite.prepare(s.sql);return /^\s*(SELECT|PRAGMA)/i.test(s.sql)?{results:stmt.all(...s.args),success:true}:{success:true,meta:{changes:Number(stmt.run(...s.args).changes)}};});sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}
}};
const env={DB,ACCOUNT_HASH_SECRET:'only-local-legacy-login-fixture-20260927',ADMIN_EMAILS:'admin@medihelpers.co.kr',SIGNUP_ENABLED:'true',LEGAL_DOCUMENT_STATUS:'approved',TEST_ACCOUNT_SWITCH_ENABLED:'true'};
async function call(url,body,cookie,method=body?'POST':'GET'){
 const response=await worker.fetch(new Request('https://audit.local'+url,{method,headers:{origin:'https://audit.local','content-type':'application/json',...(cookie?{cookie}:{})},...(body?{body:JSON.stringify(body)}:{})}),env,{});
 return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
let checks=0;const check=(a,b)=>{assert.deepEqual(a,b);checks++;};
const aliases={doctor:'old-doctor',hospital:'old-hospital',admin:'old-admin'};
const emails={doctor:'doctor-test@medihelpers.co.kr',hospital:'hospital-test@medihelpers.co.kr',admin:'admin@medihelpers.co.kr'};
for(const role of Object.keys(aliases)){
 check((await call('/api/auth/test-switch',{key:role})).status,200);
 sqlite.prepare("INSERT INTO auth_login_aliases(login_id,account_id,source) SELECT ?,account_id,'rankup' FROM auth_credentials WHERE email_normalized=?").run(aliases[role],emails[role]);
 // No existing cookie: every login issues its own session from the supplied credentials.
 const signed=await call('/api/auth/login',{email:aliases[role],password:'medihelpers1234'});
 check(signed.status,200);check(signed.body.identity.email,emails[role]);check(signed.body.isAdmin,role==='admin');
 const account=await call('/api/account',null,signed.cookie);check(account.status,200);check(account.body.signedIn,true);
 check((await call('/api/admin-console',null,signed.cookie)).status,role==='admin'?200:403);
 if(role!=='admin')check((await call('/api/resumes',null,signed.cookie)).status,role==='doctor'?200:403);
}
check((await call('/api/auth/login',{email:'OLD-DOCTOR',password:'medihelpers1234'})).status,401);
check((await call('/api/auth/login',{email:"' OR 1=1--",password:'medihelpers1234'})).status,401);
const doctorId=sqlite.prepare('SELECT account_id id FROM auth_credentials WHERE email_normalized=?').get(emails.doctor).id;
sqlite.prepare("UPDATE account_admin_profiles SET status='suspended' WHERE account_id=?").run(doctorId);
check((await call('/api/auth/login',{email:aliases.doctor,password:'medihelpers1234'})).status,403);
const sessionsBeforeHold=sqlite.prepare('SELECT COUNT(*) AS n FROM auth_sessions').get().n;
sqlite.prepare("UPDATE account_admin_profiles SET admin_note='MIGRATION_HOLD internal-only-fixture' WHERE account_id=?").run(doctorId);
const heldLogin=await call('/api/auth/login',{email:aliases.doctor,password:'medihelpers1234'});
check(heldLogin.status,403);
check(heldLogin.body.code,'ACCOUNT_MIGRATION_PENDING');
check(JSON.stringify(heldLogin.body).includes('internal-only-fixture'),false);
check(heldLogin.cookie,undefined);
check(sqlite.prepare('SELECT COUNT(*) AS n FROM auth_sessions').get().n,sessionsBeforeHold);
const heldWrongPassword=await call('/api/auth/login',{email:aliases.doctor,password:'wrong-pass'});
check(heldWrongPassword.status,401);check(heldWrongPassword.body.code,undefined);
sqlite.prepare("UPDATE account_admin_profiles SET status='withdrawn' WHERE account_id=?").run(doctorId);
const withdrawnHold=await call('/api/auth/login',{email:aliases.doctor,password:'medihelpers1234'});
check(withdrawnHold.status,403);check(withdrawnHold.body.code,undefined);
sqlite.prepare("UPDATE account_admin_profiles SET admin_note='' WHERE account_id=?").run(doctorId);
sqlite.prepare('UPDATE auth_credentials SET failed_attempts=0 WHERE account_id=?').run(doctorId);
sqlite.prepare("UPDATE account_admin_profiles SET status='active' WHERE account_id=?").run(doctorId);
for(let i=0;i<5;i++)check((await call('/api/auth/login',{email:i%2?emails.doctor:aliases.doctor,password:'wrong-pass'})).status,401);
check((await call('/api/auth/login',{email:aliases.doctor,password:'medihelpers1234'})).status,401);
check((await call('/api/auth/login',{email:emails.doctor,password:'medihelpers1234'})).status,401);
sqlite.prepare('UPDATE auth_credentials SET locked_until=NULL,failed_attempts=0 WHERE account_id=?').run(doctorId);
const salt='12'.repeat(16),oldPassword='1234';
sqlite.prepare('UPDATE auth_credentials SET password_hash=?,password_salt=?,password_iterations=100000 WHERE account_id=?').run(pbkdf2Sync(oldPassword,Buffer.from(salt,'hex'),100000,32,'sha256').toString('hex'),salt,doctorId);
check((await call('/api/auth/login',{email:aliases.doctor,password:oldPassword})).status,200);
check((await call('/api/auth/register',{email:'weak-new@example.invalid',password:oldPassword})).status,400);
check((await call('/api/auth/login',{email:aliases.doctor,password:''})).status,400);
check((await call('/api/auth/login',{email:aliases.doctor,password:'a'.repeat(129)})).status,400);
// Email-shaped aliases cannot intercept a different account's email login.
sqlite.prepare('UPDATE auth_login_aliases SET login_id=? WHERE account_id=?').run(emails.hospital,doctorId);
check((await call('/api/auth/login',{email:emails.hospital,password:oldPassword})).status,401);
check((await call('/api/auth/login',{email:emails.hospital,password:'medihelpers1234'})).status,200);
sqlite.prepare('UPDATE auth_login_aliases SET login_id=? WHERE account_id=?').run(aliases.doctor,doctorId);
// A removed credential cannot leave a usable alias behind.
sqlite.prepare('DELETE FROM auth_credentials WHERE account_id=?').run(doctorId);
check(sqlite.prepare('SELECT COUNT(*) n FROM auth_login_aliases WHERE account_id=?').get(doctorId).n,0);
check((await call('/api/auth/login',{email:aliases.doctor,password:oldPassword})).status,401);
// Two legacy users may share a real mailbox, including an administrator's mailbox.
// Their credential principal and account ownership remain independent.
const sharedEmail=emails.admin;
const isolated=[];
for(const n of [1,2]) {
 const id='legacy-isolated-'+n, principal='rankup:'+id, alias='shared-mail-'+n;
 sqlite.prepare("INSERT INTO accounts(id,user_key,role) VALUES(?,?,'doctor')").run(id,'isolated-user-key-'+n);
 sqlite.prepare('INSERT INTO auth_credentials(account_id,email_normalized,password_hash,password_salt,password_iterations) VALUES(?,?,?,?,100000)').run(id,principal,pbkdf2Sync('oldpass'+n,Buffer.from(salt,'hex'),100000,32,'sha256').toString('hex'),salt);
 sqlite.prepare("INSERT INTO account_contact_identities(account_id,email,source) VALUES(?,?,'rankup')").run(id,sharedEmail);
 sqlite.prepare("INSERT INTO auth_login_aliases(login_id,account_id,source) VALUES(?,?,'rankup')").run(alias,id);
 sqlite.prepare("INSERT INTO member_profiles(account_id,display_name,phone) VALUES(?,?,?)").run(id,'Synthetic '+n,'010-0000-000'+n);
 sqlite.prepare("INSERT INTO resumes(id,account_id,title) VALUES(?,?,?)").run('isolated-resume-'+n,id,'Resume '+n);
 sqlite.prepare("INSERT INTO consultation_requests(id,request_type,requester_name,phone,email,specialty,payload_json) VALUES(?,'doctor',?,'01000000000',?,'내과',?)").run('isolated-consultation-'+n,'Synthetic '+n,sharedEmail,JSON.stringify({ownerAccountId:id,message:'private '+n}));
 const login=await call('/api/auth/login',{email:alias,password:'oldpass'+n});
 check(login.status,200);check(login.body.identity.email,sharedEmail);check(login.body.isAdmin,false);
 const account=await call('/api/account',null,login.cookie);check(account.status,200);check(account.body.account.id,id);check(account.body.identity.principal,undefined);check(account.body.identity.userKey,undefined);
 check((await call('/api/admin-console',null,login.cookie)).status,403);
 const resumeList=await call('/api/resumes',null,login.cookie);check(resumeList.status,200);check(resumeList.body.resumes.map(r=>r.id),['isolated-resume-'+n]);
 const center=await call('/api/member-center',null,login.cookie);check(center.status,200);check(center.body.consultations.map(r=>r.id),['isolated-consultation-'+n]);
 isolated.push({id,alias,cookie:login.cookie});
}
// Sharing a mailbox cannot issue a reset for an arbitrary first account.
const resetCount=()=>sqlite.prepare('SELECT COUNT(*) n FROM account_password_resets').get().n;
const beforeReset=resetCount();
check((await call('/api/account-recovery',{requestType:'password',email:sharedEmail})).status,202);
check(resetCount(),beforeReset);
check((await call('/api/account-recovery',{requestType:'password',email:isolated[0].alias})).status,202);
check(resetCount(),beforeReset+1);
check(sqlite.prepare('SELECT account_id id,email_normalized email FROM account_password_resets ORDER BY rowid DESC LIMIT 1').get().id,isolated[0].id);
check(sqlite.prepare('SELECT email_normalized email FROM account_password_resets ORDER BY rowid DESC LIMIT 1').get().email,sharedEmail);
// Suspension takes effect for already issued sessions as well as future login attempts.
sqlite.prepare("INSERT INTO account_admin_profiles(account_id,email,status) VALUES(?,?,'suspended') ON CONFLICT(account_id) DO UPDATE SET status='suspended'").run(isolated[0].id,sharedEmail);
check((await call('/api/resumes',null,isolated[0].cookie)).status,401);
check((await call('/api/resumes',null,isolated[1].cookie)).status,200);
for(const n of [1,2]) {
 const id='legacy-hospital-'+n, principal='rankup:'+id, alias='shared-hospital-'+n;
 sqlite.prepare("INSERT INTO accounts(id,user_key,role) VALUES(?,?,'hospital')").run(id,'hospital-user-key-'+n);
 sqlite.prepare('INSERT INTO auth_credentials(account_id,email_normalized,password_hash,password_salt,password_iterations) VALUES(?,?,?,?,100000)').run(id,principal,pbkdf2Sync('hospital'+n,Buffer.from(salt,'hex'),100000,32,'sha256').toString('hex'),salt);
 sqlite.prepare("INSERT INTO account_contact_identities(account_id,email,source) VALUES(?,?,'rankup')").run(id,sharedEmail);
 sqlite.prepare("INSERT INTO auth_login_aliases(login_id,account_id,source) VALUES(?,?,'rankup')").run(alias,id);
 sqlite.prepare("INSERT INTO member_profiles(account_id,display_name,organization) VALUES(?,?,?)").run(id,'Manager '+n,'Hospital '+n);
 sqlite.prepare("INSERT INTO payment_orders(id,order_number,account_id,product_type,product_id,product_name,status,metadata_json) VALUES(?,?,?,'doctor_ad','basic','Legacy ad','paid',?)").run('legacy-order-'+n,'LEGACY-ORDER-'+n,id,JSON.stringify({contentRecordId:'legacy-job-'+n}));
 sqlite.prepare("INSERT INTO admin_content_records(id,content_type,title,subtitle,status,payload_json,created_by) VALUES(?,'doctor_job',?,?,'published','{}',?)").run('legacy-job-'+n,'Ad '+n,'Hospital '+n,principal);
 sqlite.prepare("INSERT INTO consultation_requests(id,request_type,requester_name,phone,email,specialty,payload_json) VALUES(?,'doctor','Synthetic Applicant','01000000000',?,'내과',?)").run('hospital-application-'+n,sharedEmail,JSON.stringify({ownerAccountId:isolated[1].id,jobId:'admin-legacy-job-'+n,submissionChannel:'paid_job_direct'}));
 const login=await call('/api/auth/login',{email:alias,password:'hospital'+n});check(login.status,200);check(login.body.isAdmin,false);
 const center=await call('/api/member-center',null,login.cookie);check(center.status,200);check(center.body.orders.map(r=>r.orderNumber),['LEGACY-ORDER-'+n]);
 // An imported ad has no new payment order, and must remain visible only to its own hospital.
 const migrationPayload=JSON.stringify({migration:{originalDates:{created:'2020-01-02'},services:['기존 광고 : 2020.01.02~2020.02.01'],ownerMapping:{accountId:id,bindingStatus:'protected-account-linked',legacyId:alias}}});
 sqlite.prepare("INSERT INTO admin_content_records(id,content_type,title,status,visibility,payload_json,created_by) VALUES(?,'doctor_job','Imported ad','draft','admin',?,?)").run('imported-ad-'+n,migrationPayload,principal);
 const imported=await call('/api/member-center',null,login.cookie);check(imported.status,200);check(imported.body.migratedAds.map(r=>r.id),['imported-ad-'+n]);
 check(imported.body.migratedAds[0].editable,false);check(imported.body.migratedAds[0].exposureVerified,false);
 check(imported.body.migratedAds[0].originalCreated,'2020-01-02');check(imported.body.migratedAds[0].payloadJson,undefined);check(imported.body.orders.length,1);
 sqlite.prepare('UPDATE admin_content_records SET created_by=? WHERE id=?').run('someone-else@example.invalid','imported-ad-'+n);
 check((await call('/api/member-center',null,login.cookie)).body.migratedAds.length,0);
 sqlite.prepare('UPDATE admin_content_records SET created_by=?,payload_json=json_set(payload_json,\'$.migration.ownerMapping.accountId\',?) WHERE id=?').run(principal,'wrong-account','imported-ad-'+n);
 check((await call('/api/member-center',null,login.cookie)).body.migratedAds.length,0);
 sqlite.prepare('UPDATE admin_content_records SET payload_json=? WHERE id=?').run(migrationPayload,'imported-ad-'+n);
 check((await call('/api/member-center',null,login.cookie)).body.migratedAds.length,1);
 // Direct applications are scoped by the immutable credential principal, not the shared email.
 check(center.body.consultations.filter(r=>r.id.startsWith('hospital-application-')).map(r=>r.id),['hospital-application-'+n]);
 check((await call('/api/resumes',null,login.cookie)).status,403);
}
// Initial account-secret provisioning must not recompute imported ownership keys.
// This is not permission to rotate a populated production account secret.
const preservedOwnership=sqlite.prepare('SELECT id,user_key FROM accounts ORDER BY id').all();
env.ACCOUNT_HASH_SECRET='initial-provisioning-new-synthetic-secret-20261003';
for(const n of [1,2]) {
 const login=await call('/api/auth/login',{email:'shared-hospital-'+n,password:'hospital'+n});
 check(login.status,200);check(login.body.isAdmin,false);
 const center=await call('/api/member-center',null,login.cookie);
 check(center.status,200);
 check(center.body.migratedAds.map(r=>r.id),['imported-ad-'+n]);
 check(center.body.orders.map(r=>r.orderNumber),['LEGACY-ORDER-'+n]);
 check((await call('/api/admin-console',null,login.cookie)).status,403);
}
check(sqlite.prepare('SELECT id,user_key FROM accounts ORDER BY id').all(),preservedOwnership);
env.STAGING_READ_ONLY='true';
check((await call('/api/auth/login',{email:emails.admin,password:'medihelpers1234'})).status,503);
env.STAGING_ADMIN_AUTH_ENABLED='true';
const adminLogin=await call('/api/auth/login',{email:emails.admin,password:'medihelpers1234'});
check(adminLogin.status,200);check(adminLogin.body.isAdmin,true);
check((await call('/api/admin-console',null,adminLogin.cookie)).status,200);
for(const path of ['/api/auth/register','/api/auth/test-switch','/api/payment-orders','/api/admin-refund-review','/api/consultations'])
 check((await call(path,{key:'admin'},adminLogin.cookie)).status,503);
check((await call('/api/auth/login',{email:'shared-hospital-1',password:'hospital1'})).status,503);
check((await call('/api/account-recovery',{requestType:'password',email:isolated[1].alias})).status,503);
// Even a matching administrator contact address does not make an imported principal eligible.
sqlite.prepare('UPDATE account_contact_identities SET email=? WHERE account_id=?').run(emails.admin,'legacy-hospital-1');
const adminId=sqlite.prepare('SELECT account_id id FROM auth_credentials WHERE email_normalized=?').get(emails.admin).id;
sqlite.prepare('DELETE FROM account_recovery_requests WHERE email_normalized=?').run(emails.admin);
check((await call('/api/account-recovery',{requestType:'password',email:emails.admin})).status,202);
check(sqlite.prepare('SELECT account_id id FROM account_password_resets ORDER BY rowid DESC LIMIT 1').get().id,adminId);
const raw='ab'.repeat(32),tokenHash=createHash('sha256').update(raw).digest('hex');
sqlite.prepare("UPDATE account_password_resets SET token_hash=?,expires_at=datetime('now','+30 minutes') WHERE account_id=? AND used_at IS NULL").run(tokenHash,adminId);
check((await call('/api/account-recovery',{action:'reset_password',token:'cd'.repeat(32),password:'NewAdminPassword123'})).status,503);
env.MIGRATION_MODE='frozen';
check((await call('/api/auth/login',{email:emails.admin,password:'medihelpers1234'})).status,503);
check((await call('/api/account-recovery',{action:'reset_password',token:raw,password:'NewAdminPassword123'})).status,503);
env.MIGRATION_MODE='open';
check((await call('/api/account-recovery',{action:'reset_password',token:raw,password:'NewAdminPassword123'})).status,200);
check((await call('/api/account-recovery',{action:'reset_password',token:raw,password:'NewAdminPassword123'})).status,503);
check((await call('/api/admin-console',null,adminLogin.cookie)).status,403);
const freshAdmin=await call('/api/auth/login',{email:emails.admin,password:'NewAdminPassword123'});
check(freshAdmin.status,200);check(freshAdmin.body.isAdmin,true);
check((await call('/api/auth/logout',{},freshAdmin.cookie)).status,200);
check((await call('/api/admin-console',null,freshAdmin.cookie)).status,403);
const external=await worker.fetch(new Request('https://audit.local/api/auth/login',{method:'POST',headers:{origin:'https://other.invalid','content-type':'application/json'},body:JSON.stringify({email:emails.admin,password:'NewAdminPassword123'})}),env,{});
check(external.status,503);
env.STAGING_READ_ONLY='false';delete env.STAGING_ADMIN_AUTH_ENABLED;
env.D1_UPLOADS_ENABLED='true';
const uploader=await call('/api/auth/login',{email:isolated[1].alias,password:'oldpass2'});
check(uploader.status,200);
const photo=Uint8Array.from([137,80,78,71,13,10,26,10,...new Array(200).fill(0)]);
const uploaded=await worker.fetch(new Request('https://audit.local/api/uploads',{method:'POST',headers:{origin:'https://audit.local',cookie:uploader.cookie,'content-type':'image/png','x-upload-purpose':'resume-profile'},body:photo}),env,{});
check(uploaded.status,201);const uploadData=await uploaded.json();
const imageRead=async cookie=>worker.fetch(new Request('https://audit.local'+uploadData.url,{headers:cookie?{cookie}:{}}),env,{});
const ownerRead=await imageRead(uploader.cookie);check(ownerRead.status,200);check(new Uint8Array(await ownerRead.arrayBuffer()),photo);
check((await imageRead()).status,401);
const otherHospital=await call('/api/auth/login',{email:'shared-hospital-2',password:'hospital2'});
check((await imageRead(otherHospital.cookie)).status,403);
check(sqlite.prepare('SELECT count(*) n FROM upload_objects').get().n,1);
sqlite.prepare('DELETE FROM upload_chunks').run();
check((await imageRead(uploader.cookie)).status,500);
console.log(JSON.stringify({checks,failed:0,scope:'isolated generated-worker API tests; no real member data or real PG calls'}));
if(process.argv.includes('--serve')) {
 for(const role of Object.keys(aliases)) {
  await call('/api/auth/test-switch',{key:role});
  sqlite.prepare("INSERT INTO auth_login_aliases(login_id,account_id,source) SELECT ?,account_id,'rankup' FROM auth_credentials WHERE email_normalized=? ON CONFLICT(login_id) DO NOTHING").run(aliases[role],emails[role]);
 }
 const {createServer}=await import('node:http');
 createServer(async(req,res)=>{try{
  const parts=[];for await(const part of req)parts.push(part);
  const response=await worker.fetch(new Request('http://127.0.0.1:5198'+req.url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(parts)}:{})}),env,{});
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(500);res.end('Local preview failure');}}).listen(5198,'127.0.0.1',()=>console.log('Isolated legacy login preview: http://127.0.0.1:5198/login'));
}
