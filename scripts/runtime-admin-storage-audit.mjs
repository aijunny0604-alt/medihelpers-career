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
 const headers={'content-type':'application/json',origin:'https://audit.local'};if(cookies[role])headers.cookie=cookies[role];
 const response=await worker.fetch(new Request('https://audit.local'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})}),env,{});
 let data;try{data=await response.json();}catch{data={};}
 return {status:response.status,data,cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
const cookies={};
function record(name,actual,expected){output.push({name,pass:actual===expected,actual,expected});}
for(const role of ['doctor','hospital','admin']) {const r=await call('/api/auth/test-switch','',{key:role});cookies[role]=r.cookie;record('login '+role,r.status,200);}
for(const role of ['','doctor','hospital','admin']) { const r=await call('/api/admin-console',role);record('admin access '+(role||'anonymous'),r.status,role==='admin'?200:403); }
for(const [path,method] of [['/api/admin-console','PATCH'],['/api/admin-backups','POST'],['/api/consultations/example','PATCH'],['/api/recruitment-crm','POST']])record('read-only '+path,(await call(path,'admin',{action:'audit'},method)).status,405);
const saved=await call('/api/resumes','doctor',{title:'관리자 DB 검수',name:'검수용 가상 의사',phone:'010-0000-0000',email:'audit@example.invalid',profession:'의사',specialty:'내과',detail:{introduction:'복구검수'},createNew:true});record('resume persisted',saved.status,201);
const reloaded=await call('/api/resumes','doctor');record('resume visible after reread',JSON.stringify(reloaded.data).includes(saved.data.id),true);
const consoleData=await call('/api/admin-console','admin');record('admin sees persisted resume',JSON.stringify(consoleData.data).includes(saved.data.id),true);
const objects=new Map(); let corrupt=false;
env.BACKUPS={
 async put(key,value,opts={}) {objects.set(key,{value:String(value),customMetadata:opts.customMetadata||{},uploaded:new Date(),key});},
 async get(key) {const o=objects.get(key);if(!o)return null;const value=corrupt?o.value+'corrupt':o.value;return {...o,body:value,text:async()=>value};},
 async list(opts={}) {return {objects:[...objects.values()].filter(o=>o.key.startsWith(opts.prefix||'')).map(o=>({key:o.key,size:o.value.length,uploaded:o.uploaded,...(opts.include?.includes('customMetadata')?{customMetadata:o.customMetadata}:{})})),truncated:false};},
 async delete(keys){for(const k of Array.isArray(keys)?keys:[keys])objects.delete(k);}
};
async function trigger(){delete globalThis.__mhProtectionDate;const pending=[];await worker.fetch(new Request('https://audit.local/api/account'),env,{waitUntil:p=>pending.push(p)});await Promise.all(pending);}
await trigger();const first=[...objects.values()][0];record('automatic backup object created',!!first,true);
const backup=JSON.parse(first.value);record('backup includes saved resume',backup.tables.resumes.some(r=>r.id===saved.data.id),true);record('sessions excluded',Object.hasOwn(backup.tables,'auth_sessions'),false);
const checksum=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(first.value))).toString('hex');record('stored checksum matches bytes',checksum,first.customMetadata.checksum);
const listing=await call('/api/admin-backups','admin');record('admin lists backup',listing.status,200);record('non-admin cannot list backup',(await call('/api/admin-backups','hospital')).status,403);
const download=await worker.fetch(new Request('https://audit.local/api/admin-backups?key='+encodeURIComponent(first.key),{headers:{cookie:cookies.admin}}),env,{});record('download status',download.status,200);record('download bytes match',await download.text(),first.value);record('download no-store',download.headers.get('cache-control'),'no-store');
record('invalid backup path',(await call('/api/admin-backups?key=../private','admin')).status,400);record('missing backup path',(await call('/api/admin-backups?key=backups/missing','admin')).status,404);
await trigger();record('same day creates one backup',objects.size,1);
// Restore synthetic snapshot into a separate empty SQLite database; never production.
const restored=new DatabaseSync(':memory:');restored.exec('PRAGMA foreign_keys=OFF');
for(const row of sqlite.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND sql IS NOT NULL").all())restored.exec(row.sql);
for(const [table,rows] of Object.entries(backup.tables)){ for(const row of rows){const keys=Object.keys(row);restored.prepare('INSERT INTO "'+table+'" ('+keys.map(k=>'"'+k+'"').join(',')+') VALUES ('+keys.map(()=>'?').join(',')+')').run(...keys.map(k=>row[k]));}}
record('all restored table counts match',Object.entries(backup.tables).every(([t,rows])=>restored.prepare('SELECT COUNT(*) n FROM "'+t+'"').get().n===rows.length),true);record('restored resume content',restored.prepare('SELECT title FROM resumes WHERE id=?').get(saved.data.id).title,'관리자 DB 검수');record('restored foreign keys valid',restored.prepare('PRAGMA foreign_key_check').all().length,0);
sqlite.prepare("DELETE FROM site_settings WHERE setting_key='data_protection_daily_claim'").run();corrupt=true;await trigger();record('corrupt readback recorded failure',sqlite.prepare("SELECT COUNT(*) n FROM data_protection_runs WHERE run_type='backup' AND status='failed'").get().n>0,true);record('corrupt backup removed',objects.size,1);
corrupt=false;await trigger();record('backup recovers after storage corruption',objects.size,2);
const observed={tables:Object.keys(backup.tables).length,listedChecksum:listing.data.objects[0].checksum,listingMetadataRequested:!!listing.data.objects[0].checksum,restoreScope:'synthetic SQLite; does not restore R2 uploads or validate production D1 restore'};
console.log(JSON.stringify({checks:output.map(x=>({...x,...(x.name==='download bytes match'?{actual:'[bytes compared]',expected:'[same bytes]'}:{})})),observed,sqlErrors},null,2));if(output.some(x=>x.pass===false))process.exitCode=1;