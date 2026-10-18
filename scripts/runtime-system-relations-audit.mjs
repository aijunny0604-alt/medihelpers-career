// Cross-feature acceptance on an isolated SQLite copy. No live customers, mail or PG.
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
import {PRIVACY_FORM_VERSION} from '../src/privacyConsent.js';
import worker from '../dist/server/index.js';
const db=new DatabaseSync(':memory:');
for(const f of (await readdir(new URL('../drizzle/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort())db.exec(await readFile(new URL('../drizzle/'+f,import.meta.url),'utf8'));
class Statement {
 constructor(sql,args=[]){this.sql=sql;this.args=args;}
 bind(...args){return new Statement(this.sql,args);}
 async first(column){const r=db.prepare(this.sql).get(...this.args);return column?r?.[column]:r;}
 async all(){return {results:db.prepare(this.sql).all(...this.args),success:true};}
 async run(){const r=db.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(r.changes)}};}
}
const DB={prepare:s=>new Statement(s),exec:async s=>db.exec(s),batch:async list=>{db.exec('BEGIN');try{const result=list.map(s=>{const statement=db.prepare(s.sql);if(/^\s*(SELECT|PRAGMA)/i.test(s.sql))return{results:statement.all(...s.args),success:true};return{success:true,meta:{changes:Number(statement.run(...s.args).changes)}};});db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}};
const env={DB,ACCOUNT_HASH_SECRET:'isolated-system-audit-secret-at-least-32',ADMIN_EMAILS:'admin@medihelpers.co.kr',TEST_ACCOUNT_SWITCH_ENABLED:'true',SIGNUP_ENABLED:'true',LEGAL_DOCUMENT_STATUS:'published'};
const cookies={},checks=[];
const check=(name,actual,expected)=>checks.push({name,pass:actual===expected,actual,expected});
const one=(sql,...args)=>db.prepare(sql).get(...args);
const count=table=>one('SELECT COUNT(*) n FROM '+table).n;
async function call(path,role='',body,method=body?'POST':'GET',origin='https://audit.local'){
 const r=await worker.fetch(new Request('https://audit.local'+path,{method,headers:{cookie:cookies[role]||'',origin,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env,{});
 let data;try{data=await r.json();}catch{}return {status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0]};
}
const consent={privacyVersion:PRIVACY_FORM_VERSION,privacyConsent:true};
for(const role of ['doctor','hospital','admin']){const r=await call('/api/auth/test-switch','',{key:role});cookies[role]=r.cookie;check('isolated session '+role,r.status,200);}
await call('/api/admin-console','admin');await call('/api/member-center','hospital');
const ids=Object.fromEntries(['doctor','hospital'].map(role=>[role,one('SELECT account_id id FROM auth_credentials WHERE email_normalized=?',role+'-test@medihelpers.co.kr').id]));
const signup={...consent,email:'system-other@example.invalid',password:'Synthetic-only-2026!',role:'doctor',displayName:'격리 지원자',phone:'01000000000',professionType:'의사',termsAccepted:true,privacyAcknowledged:true,ageConfirmed:true};
cookies.other=(await call('/api/auth/register','',signup)).cookie;
const resume=(await call('/api/resumes','doctor',{...consent,title:'관계 검수 이력서',createNew:true,specialty:'내과',desiredRegions:'서울',detail:{introduction:'격리 환경에서 상담 접수 및 제출본 보존과 회원별 권한을 확인하는 가상 자료입니다.'}})).data;
const content=(id,type,payload={},visibility='public',status='published',owner='hospital-test@medihelpers.co.kr')=>db.prepare('INSERT INTO admin_content_records(id,content_type,title,subtitle,status,visibility,payload_json,created_by) VALUES(?,?,?,?,?,?,?,?)').run(id,type,'원본 '+id,'원본 병원',status,visibility,JSON.stringify(payload),owner);
content('direct-doctor','doctor_job');content('direct-medical','medical_job');
content('head-doctor','doctor_job',{publicationChannel:'headhunt_board'},'doctor','published','admin@medihelpers.co.kr');
content('head-medical','medical_job',{publicationChannel:'headhunt_board'},'doctor','published','admin@medihelpers.co.kr');
const base={...consent,requestType:'doctor',payload:{name:'조작 성명',phone:'01000000000',specialty:'내과',resumeId:resume.id}};
const direct=id=>({...base,thirdPartyConsent:true,recipient:'원본 병원',payload:{...base.payload,jobId:'admin-'+id}});
const head=id=>({...base,payload:{...base.payload,headhuntPostId:id,headhuntPostTitle:'FORGED',headhuntPostHospital:'FORGED'}});
for(const id of ['direct-doctor','direct-medical']){
 const response=await call('/api/consultations','doctor',direct(id));check(id+' application accepted',response.status,201);
 const row=one('SELECT payload_json p FROM consultation_requests WHERE id=?',response.data.id||'');
 const saved=row?JSON.parse(row.p):{};
 check(id+' submitted resume snapshot',saved.resumeSnapshot?.id,resume.id);
 check(id+' server hospital name',saved.jobHospital,'원본 병원');
 check(id+' recipient member center',(await call('/api/member-center','hospital')).data.consultations.some(x=>x.id===response.data.id),true);
 check(id+' applicant member center',(await call('/api/member-center','doctor')).data.consultations.some(x=>x.id===response.data.id),true);
 check(id+' other member excluded',(await call('/api/member-center','other')).data.consultations.some(x=>x.id===response.data.id),false);
 check(id+' headhunter inbox excluded',(await call('/api/consultations','admin')).data.requests.some(x=>x.id===response.data.id),false);
 check(id+' notification and inbox linked',!!one("SELECT id FROM member_notifications WHERE account_id=? AND action_url LIKE ?",ids.hospital,'%'+response.data.id),true);
}
const reject=async(name,input,status)=>{const before=count('consultation_requests');check(name,(await call('/api/consultations','doctor',input)).status,status);check(name+' no submission',count('consultation_requests'),before);};
await reject('missing recipient consent',{...direct('direct-doctor'),thirdPartyConsent:false},400);
await reject('mismatched recipient',{...direct('direct-doctor'),recipient:'다른 병원'},400);
for(const visibility of ['admin','hospital']){
 db.prepare('UPDATE admin_content_records SET visibility=? WHERE id=?').run(visibility,'direct-doctor');
 await reject('direct restricted '+visibility,direct('direct-doctor'),409);
}
db.prepare("UPDATE admin_content_records SET visibility='public' WHERE id='direct-doctor'").run();
for(const status of ['hidden','closed','draft']){
 db.prepare('UPDATE admin_content_records SET status=? WHERE id=?').run(status,'direct-doctor');
 await reject('direct '+status,direct('direct-doctor'),409);
}
db.prepare("UPDATE admin_content_records SET status='published',payload_json='{\"exposureEnd\":\"2000-01-01\"}' WHERE id='direct-doctor'").run();
await reject('direct expired',direct('direct-doctor'),409);
db.prepare("UPDATE admin_content_records SET payload_json='{}' WHERE id='direct-doctor'").run();
db.prepare("UPDATE account_admin_profiles SET status='suspended' WHERE account_id=?").run(ids.hospital);
await reject('inactive recipient cannot receive application',direct('direct-doctor'),409);
db.prepare("UPDATE account_admin_profiles SET status='active' WHERE account_id=?").run(ids.hospital);
await reject('headhunt record cannot bypass channel',direct('head-doctor'),409);
for(const id of ['head-doctor','head-medical']){
 const r=await call('/api/consultations','doctor',head(id));check(id+' accepted',r.status,201);
 const p=JSON.parse(one('SELECT payload_json p FROM consultation_requests WHERE id=?',r.data.id).p);
 check(id+' trusted title',p.headhuntPostTitle,'원본 '+id);check(id+' trusted hospital',p.headhuntPostHospital,'원본 병원');
 check(id+' admin inbox',(await call('/api/consultations','admin')).data.requests.some(x=>x.id===r.data.id),true);
 check(id+' not sent to hospital',(await call('/api/member-center','hospital')).data.consultations.some(x=>x.id===r.data.id),false);
}
await reject('nonexistent headhunt',head('missing'),409);
await reject('paid ad cannot pose as headhunt',head('direct-doctor'),409);
for(const status of ['hidden','closed','draft']){
 db.prepare('UPDATE admin_content_records SET status=? WHERE id=?').run(status,'head-doctor');
 await reject('headhunt '+status,head('head-doctor'),409);
}
db.prepare("UPDATE admin_content_records SET status='published',visibility='admin' WHERE id='head-doctor'").run();
await reject('restricted headhunt',head('head-doctor'),409);
db.prepare("UPDATE admin_content_records SET visibility='doctor',payload_json=json_set(payload_json,'$.exposureEnd','2000-01-01') WHERE id='head-doctor'").run();
await reject('expired headhunt',head('head-doctor'),409);
const hiring={...consent,requestType:'hospital',payload:{hospital:'원본 병원',phone:'01000000000',specialty:'내과',submissionChannel:'mypage_headhunter'}};
const tables=['consultation_requests','recruitment_cases','processing_consent_events','member_activity','member_notifications'];
// Storage failure after the consultation must roll back the entire business operation.
const before=Object.fromEntries(tables.map(t=>[t,count(t)]));
db.exec("CREATE TRIGGER audit_reject_case BEFORE INSERT ON recruitment_cases BEGIN SELECT RAISE(ABORT,'synthetic CRM outage'); END");
check('CRM outage fails explicitly',(await call('/api/consultations','hospital',hiring)).status,503);
for(const t of tables)check('CRM outage no partial '+t,count(t),before[t]);
db.exec('DROP TRIGGER audit_reject_case');
const retry=await call('/api/consultations','hospital',hiring);check('hiring retry succeeds',retry.status,201);
for(const t of tables)check('hiring once '+t,count(t),before[t]+1);
check('case linked to request',one('SELECT consultation_id id FROM recruitment_cases ORDER BY rowid DESC LIMIT 1').id,retry.data.id);
check('not configured mail honest',retry.data.notifications.email,'not_configured');
const alerts=(await call('/api/member-center?notificationsOnly=1','hospital')).data;
check('notification count coherent',alerts.unreadCount,alerts.alerts.filter(x=>!x.readAt).length);
check('notification URL resolves',(await call(alerts.alerts[0].actionUrl,'hospital')).status,200);
await call('/api/member-center','other',{action:'notifications_read_all'});
check('other member read all isolated',(await call('/api/member-center?notificationsOnly=1','hospital')).data.unreadCount,alerts.unreadCount);
await call('/api/member-center','hospital',{action:'notifications_read_all'});
check('recipient read all persists',(await call('/api/member-center?notificationsOnly=1','hospital')).data.unreadCount,0);
check('anonymous consultation blocked',(await call('/api/consultations','',base)).status,401);
check('wrong role consultation blocked',(await call('/api/consultations','hospital',base)).status,403);
check('cross origin consultation blocked',(await call('/api/consultations','doctor',base,'POST','https://evil.invalid')).status,403);
check('nonadmin CRM blocked',(await call('/api/recruitment-crm','hospital')).status,401);
check('admin CRM loads',(await call('/api/recruitment-crm','admin')).status,200);
check('read only CRM preserved',(await call('/api/recruitment-crm/test','admin',{stage:'hired'},'PATCH')).status,405);
check('foreign keys intact',db.prepare('PRAGMA foreign_key_check').all().length,0);
console.log(JSON.stringify({checks:checks.length,failed:checks.filter(x=>!x.pass)},null,2));
if(checks.some(x=>!x.pass))process.exitCode=1;
