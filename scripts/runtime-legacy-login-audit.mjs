import { DatabaseSync } from 'node:sqlite';
import { readFile, readdir } from 'node:fs/promises';
import { pbkdf2Sync } from 'node:crypto';
import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';
const sqlite = new DatabaseSync(':memory:');
sqlite.exec('PRAGMA foreign_keys=ON');
for (const file of (await readdir(new URL('../drizzle/',import.meta.url))).filter(x=>x.endsWith('.sql')).sort()) sqlite.exec(await readFile(new URL('../drizzle/'+file,import.meta.url),'utf8'));
class Statement {
  constructor(sql,args=[]) {this.sql=sql;this.args=args;}
  bind(...args) {return new Statement(this.sql,args);}
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
