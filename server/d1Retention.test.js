import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {runBoundedD1Retention} from './d1Retention.js';
function fixture(){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
 sql.exec(readFileSync(new URL('../drizzle/0021_bounded_uploads.sql',import.meta.url),'utf8'));
 sql.exec(readFileSync(new URL('../drizzle/0006_data_protection.sql',import.meta.url),'utf8'));
 sql.exec("CREATE TABLE hospital_verification_requests(id TEXT PRIMARY KEY,account_id TEXT,document_key TEXT,retention_until TEXT,submitted_at TEXT); CREATE TABLE member_registration_profiles(account_id TEXT,profile_json TEXT,updated_at TEXT); CREATE TABLE resumes(detail_json TEXT); CREATE TABLE consultation_requests(payload_json TEXT);");
 const wrap=(query,args=[])=>({bind(...v){return wrap(query,v);},async all(){return {results:sql.prepare(query).all(...args)};},async run(){return {meta:{changes:Number(sql.prepare(query).run(...args).changes)}};}});
 const env={D1_UPLOADS_ENABLED:'true',D1_RETENTION_ENABLED:'true',DB:{prepare:wrap,async batch(stmts){sql.exec('BEGIN');try{const results=[];for(const s of stmts)results.push(await s.run());sql.exec('COMMIT');return results;}catch(e){sql.exec('ROLLBACK');throw e;}}}};
 const file=(key,date='2000-01-01')=>{sql.prepare("INSERT INTO upload_objects VALUES(?,1,'test','{}',?)").run(key,date);sql.prepare("INSERT INTO upload_chunks VALUES(?,0,X'01')").run(key);};
 const document=(id,key,expiry='2000-01-01',submitted='2000-01-01')=>sql.prepare('INSERT INTO hospital_verification_requests VALUES(?,?,?,?,?)').run(id,'owner',key,expiry,submitted);
 return {sql,env,file,document,count:t=>sql.prepare('SELECT count(*) n FROM '+t).get().n};
}
for(const patch of [{D1_RETENTION_ENABLED:'false'},{STAGING_READ_ONLY:'true'},{MIGRATION_MODE:'frozen'},{MIGRATION_MODE:'drain'},{BACKUPS:{}},{UPLOADS:{}}])test('retention skips '+JSON.stringify(patch),async()=>{
 const {env}=fixture();Object.assign(env,patch);env.DB={prepare(){throw Error('must not query');}};assert.ok((await runBoundedD1Retention(env)).skipped);
});
test('expiry deletes document+chunks, records proof without other profile changes',async()=>{
 const f=fixture();f.file('verifications/hospitals/owner/a.pdf');f.document('a','verifications/hospitals/owner/a.pdf');f.sql.exec("INSERT INTO member_registration_profiles VALUES('owner','{\"name\":\"kept\"}',NULL)");
 assert.equal((await runBoundedD1Retention(f.env)).expiredRecords,1);assert.equal(f.count('upload_chunks'),0);assert.equal(f.count('hospital_verification_requests'),0);
 const p=JSON.parse(f.sql.prepare('SELECT profile_json p FROM member_registration_profiles').get().p);assert.equal(p.name,'kept');assert.equal(p.hospitalDocument.status,'expired');
});
test('retains referenced photos, recent/unknown dates and hospital banners',async()=>{
 const f=fixture();for(const name of ['resume','snapshot','orphan'])f.file('profiles/owner/'+name+'.png');f.file('profiles/owner/recent.png',new Date().toISOString());f.file('profiles/owner/unknown.png','invalid');f.file('hospitals/banner/a.png');
 f.sql.prepare('INSERT INTO resumes VALUES(?)').run(JSON.stringify({photoUrl:'/api/uploads/profiles/owner/resume.png'}));f.sql.prepare('INSERT INTO consultation_requests VALUES(?)').run(JSON.stringify({resumeSnapshot:{detail:{photoUrl:'/api/uploads/profiles/owner/snapshot.png'}}}));
 assert.equal((await runBoundedD1Retention(f.env)).orphanFiles,1);assert.equal(f.count('upload_objects'),5);assert.equal(f.count('upload_chunks'),5);
});
test('active or invalid-expiry shared document and newer submission retained',async()=>{
 const f=fixture(),key='verifications/hospitals/owner/shared.pdf';f.file(key);f.document('old',key);f.document('new',key,'invalid','2020-01-01');f.sql.exec("INSERT INTO member_registration_profiles VALUES('owner','{\"hospitalDocument\":{\"status\":\"current\"}}',NULL)");
 await runBoundedD1Retention(f.env);assert.equal(f.count('upload_objects'),1);assert.equal(f.count('hospital_verification_requests'),1);assert.equal(JSON.parse(f.sql.prepare('SELECT profile_json p FROM member_registration_profiles').get().p).hospitalDocument.status,'current');
});
test('bounded work progresses without skipping eligible files',async()=>{
 const f=fixture();for(let i=0;i<12;i++)f.file('profiles/owner/'+i+'.png');assert.equal((await runBoundedD1Retention(f.env)).orphanFiles,5);assert.equal((await runBoundedD1Retention(f.env)).orphanFiles,5);assert.equal((await runBoundedD1Retention(f.env)).orphanFiles,2);assert.equal(f.count('upload_chunks'),0);
});
test('orphan document ages out but same-time active submission keeps profile',async()=>{
 const f=fixture();f.file('verifications/hospitals/owner/orphan.pdf');f.file('verifications/hospitals/owner/active.pdf');f.document('old','verifications/hospitals/owner/old.pdf');f.document('active','verifications/hospitals/owner/active.pdf','2999-01-01');f.sql.exec("INSERT INTO member_registration_profiles VALUES('owner','{\"hospitalDocument\":{\"status\":\"current\"}}',NULL)");
 const r=await runBoundedD1Retention(f.env);assert.equal(r.orphanFiles,1);assert.equal(f.count('upload_objects'),1);assert.equal(JSON.parse(f.sql.prepare('SELECT profile_json p FROM member_registration_profiles').get().p).hospitalDocument.status,'current');
});
test('expiry renewed after selection is rechecked inside mutation',async()=>{
 const f=fixture(),key='verifications/hospitals/owner/a.pdf';f.file(key);f.document('a',key);const batch=f.env.DB.batch;f.env.DB.batch=async s=>{f.sql.exec("UPDATE hospital_verification_requests SET retention_until='2999-01-01'");return batch(s);};assert.equal((await runBoundedD1Retention(f.env)).expiredRecords,0);assert.equal(f.count('upload_objects'),1);
});
test('audit failure rolls back file and record deletion',async()=>{
 const f=fixture(),key='verifications/hospitals/owner/a.pdf';f.file(key);f.document('a',key);f.sql.exec("CREATE TRIGGER fail_log BEFORE INSERT ON data_protection_runs BEGIN SELECT RAISE(ABORT,'test failure'); END;");await assert.rejects(runBoundedD1Retention(f.env),/test failure/);assert.equal(f.count('upload_chunks'),1);assert.equal(f.count('hospital_verification_requests'),1);
});
