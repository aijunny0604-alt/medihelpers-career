// Generated Worker + in-memory SQLite only. No network, live accounts or PG traffic.
import {DatabaseSync} from 'node:sqlite';
import worker from '../dist/server/index.js';
const db=new DatabaseSync(':memory:');
db.exec(`CREATE TABLE feature_flags(flag_key TEXT PRIMARY KEY,enabled INTEGER);
CREATE TABLE admin_content_records(id TEXT PRIMARY KEY,content_type TEXT,status TEXT,visibility TEXT,payload_json TEXT);`);
const DB={prepare(sql){return {args:[],bind(...args){this.args=args;return this;},async first(){return db.prepare(sql).get(...this.args)||null;},async all(){return {results:db.prepare(sql).all(...this.args)};}};}};
const checks=[];
const record=(name,actual,expected)=>checks.push({name,pass:actual===expected,actual,expected});
const path='/work/employ_detail.html';
const request=(query,method='GET',extra={})=>worker.fetch(new Request('https://audit.local'+path+query,{method}),{DB,...extra},{});
const seed=(status='published',visibility='public',payload={},id='legacy-safe')=>{
 db.prepare('INSERT INTO admin_content_records VALUES(?,?,?,?,?)').run(id,'doctor_job',status,visibility,JSON.stringify({migration:{sourceUrl:'https://www.medihelpers.co.kr'+path+'?no=324'},...payload}));
};
for(const query of ['', '?no=', '?no=0','?no=-1','?no=324&no=325','?no=324%27','?no=999']) record('invalid/unmapped '+query,(await request(query)).status,404);
seed();
let response=await request('?no=324&next=https://outside.invalid&secret=discard');
record('published exact legacy mapping',response.status,301);
record('same-origin destination only',response.headers.get('location'),'/jobs/admin-legacy-safe');
record('redirect not cached',response.headers.get('cache-control'),'no-store');
record('no source payload returned',await response.text(),'');
record('HEAD redirect',(await request('?no=324','HEAD')).status,301);
record('POST not redirected',(await request('?no=324','POST')).status,405);
for(const [status,visibility] of [['draft','admin'],['hidden','public'],['published','hospital'],['published','admin']]){
 db.exec('DELETE FROM admin_content_records');seed(status,visibility);
 record(status+'/'+visibility+' protected',(await request('?no=324')).status,404);
}
db.exec('DELETE FROM admin_content_records');seed('published','public',{exposureEnd:'2000-01-01'});
record('expired mapping hidden',(await request('?no=324')).status,404);
db.exec('DELETE FROM admin_content_records');seed();seed('published','public',{},'duplicate');
record('ambiguous mapping refused',(await request('?no=324')).status,404);
db.prepare('DELETE FROM admin_content_records WHERE id=?').run('duplicate');
db.exec("INSERT INTO feature_flags VALUES('doctorRecruitment',0)");
record('disabled recruitment hidden',(await request('?no=324')).status,404);
record('missing DB fails closed',(await request('?no=324','GET',{DB:null})).status,503);
record('read-only lookup does not mutate records',db.prepare('SELECT COUNT(*) AS n FROM admin_content_records').get().n,1);
console.log(JSON.stringify({checks,failed:checks.filter(c=>!c.pass)},null,2));
db.close();
if(checks.some(c=>!c.pass))process.exitCode=1;
