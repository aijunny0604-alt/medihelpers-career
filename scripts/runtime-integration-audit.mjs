import { PRIVACY_FORM_VERSION } from '../src/privacyConsent.js';
// Run after npm run build. Exercises the generated Worker with an isolated in-memory SQLite DB.
import { DatabaseSync } from 'node:sqlite';
import { readFile, readdir } from 'node:fs/promises';
import worker from '../dist/server/index.js';

const sqlite = new DatabaseSync(':memory:');
for(const file of (await readdir(new URL('../drizzle/',import.meta.url))).filter(x=>x.endsWith('.sql') && !x.startsWith('0013')).sort()) sqlite.exec(await readFile(new URL('../drizzle/'+file,import.meta.url),'utf8'));
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
for(const role of ['doctor','hospital','admin']) {const r=await call('/api/auth/test-switch','',{key:role});cookies[role]=r.cookie;record('fresh session '+role,r.status,200);}
record('older DB automatically creates consent table',!!one("SELECT name FROM sqlite_master WHERE name='processing_consent_events'"),true);
// Continue independent scenarios even when upgrade is broken.
sqlite.exec(await readFile(new URL('../drizzle/0013_processing_consent_events.sql',import.meta.url),'utf8'));
const doctorId=one("SELECT account_id id FROM auth_credentials WHERE email_normalized='doctor-test@medihelpers.co.kr'").id;
const hospitalId=one("SELECT account_id id FROM auth_credentials WHERE email_normalized='hospital-test@medihelpers.co.kr'").id;
const signup={...consent,email:'integration-doctor@example.invalid',password:'Integration-2026!',role:'doctor',displayName:'가상 지원자',phone:'01000000000',professionType:'의사',termsAccepted:true,privacyAcknowledged:true,ageConfirmed:true};
const second=await call('/api/auth/register','',signup);cookies.other=second.cookie;record('new member registration',second.status,201);
record('new member data persists',(await call('/api/account','other')).data.profile?.name,'가상 지원자');
record('legacy acknowledgement rejects stale version',(await call('/api/account','doctor',{role:'doctor',termsAccepted:true,privacyAcknowledged:true,ageConfirmed:true})).status,400);
const objects=new Map();
env.BACKUPS={
 async put(key,value,opts={}){objects.set(key,{key,value,httpMetadata:opts.httpMetadata,customMetadata:opts.customMetadata||{},uploaded:new Date()});},
 async get(key){const o=objects.get(key);return o?{...o,body:o.value,text:async()=>String(o.value)}:null;},
 async list(opts={}){return{objects:[...objects.values()].filter(o=>o.key.startsWith(opts.prefix||'')).map(o=>({...o,size:o.value?.byteLength||String(o.value).length})),truncated:false};},
 async delete(keys){for(const k of Array.isArray(keys)?keys:[keys])objects.delete(k);}
};
const png=Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0]);
async function upload(role,bytes=png,purpose='resume-profile',type='image/png'){
 const r=await worker.fetch(new Request('https://audit.local/api/uploads',{method:'POST',headers:{cookie:cookies[role],origin:'https://audit.local','content-type':type,'x-upload-purpose':purpose},body:bytes}),env,{});return{status:r.status,data:await r.json()};
}
async function imageStatus(role,url){return(await worker.fetch(new Request('https://audit.local'+url,{headers:{cookie:cookies[role]||''}}),env,{})).status;}
record('fake image rejected',(await upload('doctor',new TextEncoder().encode('<html>not an image</html>'))).status,400);
const photo=await upload('doctor');record('profile image uploaded',photo.status,201);
const unused=await upload('doctor');
const resume=await call('/api/resumes','doctor',{...consent,title:'연동 검수 이력서',name:'가상 의료인',phone:'01000000000',profession:'의사',specialty:'내과',desiredRegions:'서울',createNew:true,detail:{photoUrl:photo.data.url,introduction:'합성 시험용 경력입니다. 내과 외래 진료 경력과 희망 근무 조건을 검증합니다.'}});
record('resume stored privately',one('SELECT visibility FROM resumes WHERE id=?',resume.data.id)?.visibility,'private');
record('other member cannot edit resume',(await call('/api/resumes','other',{...consent,resumeId:resume.data.id,title:'변조',name:'변조',phone:'01000000000'})).status,404);
record('anonymous cannot read photo',await imageStatus('',photo.data.url),401);
const postInput={...consent,publicationAcknowledged:true,resumeId:resume.data.id,title:'연동 구직글',contactVisibility:'private'};
const post=await call('/api/job-seeker-posts','doctor',postInput);record('job seeker publication',post.status,201);
record('independent second publication',(await call('/api/job-seeker-posts','doctor',postInput)).status,201);
record('public listing excludes private phone',JSON.stringify((await call('/api/site-operations')).data).includes('01000000000'),false);
const buy=async productId=>call('/api/payment-orders','hospital',{...consent,checkoutAcknowledged:true,productId,metadata:{hospital:'연동 검수 병원',department:'내과',address:'서울',title:productId+' 연동 검수',banner:'/banners/templates/medical-blue-v1.jpg',brandImageLayout:'template-overlay'}});
const orders=[];
for(const product of ['featured','basic']){
 const r=await buy(product);orders.push(r.data.order);record(product+' order created',r.status,201);
 record(product+' starts draft',one('SELECT status FROM admin_content_records WHERE id=?',r.data.order.contentRecordId)?.status,'draft');
 record(product+' approve',(await call('/api/payment-approve','hospital',{orderNumber:r.data.order.orderNumber})).status,200);
 record(product+' publishes corresponding ad',one('SELECT status FROM admin_content_records WHERE id=?',r.data.order.contentRecordId)?.status,'published');
}
const ad=orders[0];
record('ad order ownership enforced',(await call('/api/member-center','other',{action:'owned_ad_update',contentRecordId:ad.contentRecordId,content:{title:'변조',hospital:'변조'}})).status,403);
const oldExposure=one('SELECT payload_json p FROM admin_content_records WHERE id=?',ad.contentRecordId).p;
record('owner banner edit',(await call('/api/member-center','hospital',{action:'owned_ad_update',contentRecordId:ad.contentRecordId,content:{title:'수정 연동 공고',hospital:'연동 검수 병원',department:'내과',address:'서울',banner:'/banners/templates/wellness-mint-v1.jpg',brandImageLayout:'template-overlay'}})).status,200);
const edited=one('SELECT payload_json p FROM admin_content_records WHERE id=?',ad.contentRecordId).p;
record('edit preserves paid exposure',JSON.stringify(JSON.parse(edited).exposure),JSON.stringify(JSON.parse(oldExposure).exposure));
record('edit syncs order banner',JSON.parse(one('SELECT metadata_json p FROM payment_orders WHERE order_number=?',ad.orderNumber).p).banner,'/banners/templates/wellness-mint-v1.jpg');
const application={...consent,thirdPartyConsent:true,recipient:'메디헬퍼스 테스트병원',requestType:'doctor',payload:{name:'가상 의료인',phone:'01000000000',specialty:'내과',jobId:'admin-'+ad.contentRecordId,resumeId:resume.data.id}};
const applied=await call('/api/consultations','doctor',application);record('direct application',applied.status,201);
record('recipient sees application',(await call('/api/member-center','hospital')).data.consultations.some(x=>x.id===applied.data.id),true);
record('other member cannot see application',(await call('/api/member-center','other')).data.consultations.some(x=>x.id===applied.data.id),false);
record('direct applicant photo visible to recipient',await imageStatus('hospital',photo.data.url),200);
record('other photo of applicant remains private',await imageStatus('hospital',unused.data.url),403);
const snapshot=JSON.parse(one('SELECT payload_json p FROM consultation_requests WHERE id=?',applied.data.id).p).resumeSnapshot;
await call('/api/resumes','doctor',{...consent,resumeId:resume.data.id,title:'지원 이후 수정',name:'가상 의료인',phone:'01000000000',profession:'의사',specialty:'내과',desiredRegions:'서울',detail:{introduction:'변경한 합성 시험용 경력입니다. 내과 외래 진료 경력과 희망 근무 조건을 검증합니다.'}});
record('submitted snapshot preserved',JSON.parse(one('SELECT payload_json p FROM consultation_requests WHERE id=?',applied.data.id).p).resumeSnapshot.title,snapshot.title);
sqlite.prepare("UPDATE admin_content_records SET payload_json=json_set(payload_json,'$.exposureEnd','2000-01-01','$.exposure',NULL) WHERE id=?").run(ad.contentRecordId);
record('expired ad excluded from public API',(await call('/api/site-operations')).data.contents.some(x=>x.id===ad.contentRecordId),false);
record('expired ad rejects stale application',(await call('/api/consultations','doctor',application)).status,409);
sqlite.prepare('UPDATE admin_content_records SET payload_json=? WHERE id=?').run(edited,ad.contentRecordId);
const pack=await buy('talent-unlock-pack');await call('/api/payment-approve','hospital',{orderNumber:pack.data.order.orderNumber});
const talent='/api/talent-detail/seeker-'+post.data.post.id;
const detail=await call(talent,'hospital');record('ticket sees private-contact detail',detail.data.contactProtected,true);record('private phone hidden',detail.data.detail?.phone,'');
const used=()=>one('SELECT SUM(used_credits) n FROM talent_credit_pools WHERE hospital_account_id=?',hospitalId).n;
record('first view consumes one',used(),1);await call(talent,'hospital');record('repeat view does not consume',used(),1);
record('unreferenced photo stays private after ticket',await imageStatus('hospital',unused.data.url),403);
await call('/api/job-seeker-posts/'+post.data.post.id,'doctor',{...postInput,contactVisibility:'ticket',contactConsent:true},'PATCH');
record('contact opt-in reflected',(await call(talent,'hospital')).data.detail?.phone,'010-0000-0000');
await call('/api/job-seeker-posts/'+post.data.post.id,'doctor',postInput,'PATCH');
record('contact revocation reflected',(await call(talent,'hospital')).data.detail?.phone,'');
record('contact revocation evidence recorded',!!one("SELECT id FROM processing_consent_events WHERE scope='contact' AND json_extract(notice_json,'$.granted')=0 AND resource_id=?",post.data.post.id),true);
record('delete publication',(await call('/api/job-seeker-posts/'+post.data.post.id,'doctor',undefined,'DELETE')).status,200);
record('deleted post denies ticket',(await call(talent,'hospital')).status,404);
record('deleted post does not consume credit',used(),1);
const currentProfile=(await call('/api/member-center','doctor')).data.profile;
record('nonboolean marketing rejected',(await call('/api/member-center','doctor',{profile:currentProfile,notifications:{marketing:'true'}},'PATCH')).status,400);
record('marketing string never enables permission',one('SELECT marketing_notifications n FROM member_preferences WHERE account_id=?',doctorId)?.n||0,0);
record('profile-only patch',(await call('/api/member-center','doctor',{profile:currentProfile},'PATCH')).status,200);
await call('/api/member-center','doctor',{profile:currentProfile,notifications:{email:true,sms:true,service:true,marketing:false}},'PATCH');
await call('/api/member-center','doctor',{notifications:{service:false}},'PATCH');
record('preferences update preserves member name',(await call('/api/account','doctor')).data.profile?.name,currentProfile.displayName);
record('preferences update preserves email preference',one('SELECT email_notifications n FROM member_preferences WHERE account_id=?',doctorId)?.n,1);
const alert=(await call('/api/member-center?notificationsOnly=1','hospital')).data.alerts[0];
await call('/api/member-center','other',{action:'notification_read',notificationId:alert.id});
record('other member cannot mark notification read',one('SELECT read_at FROM member_notifications WHERE id=?',alert.id).read_at,null);
await call('/api/member-center','hospital',{action:'notification_read',notificationId:alert.id});record('recipient marks notification read',!!one('SELECT read_at FROM member_notifications WHERE id=?',alert.id).read_at,true);
record('refund request',(await call('/api/member-center','hospital',{action:'refund_request',orderNumber:ad.orderNumber,reason:'합성 시험'})).status,200);
record('duplicate refund request rejected',(await call('/api/member-center','hospital',{action:'refund_request',orderNumber:ad.orderNumber,reason:'합성 시험'})).status,409);
// External adapters are intercepted in memory; no real email or SMS is sent.
const originalFetch=globalThis.fetch, deliveries=[];
globalThis.fetch=async(url,options)=>{deliveries.push({url:String(url),body:JSON.parse(options.body)});return new Response('{}',{status:200,headers:{'content-type':'application/json'}});};
env.SOLAPI_API_KEY='test';env.SOLAPI_API_SECRET='test';env.SOLAPI_SENDER='051-342-5463';env.ALERT_SMS_TO='010-0000-0000';
const hiring=await call('/api/consultations','hospital',{...consent,requestType:'hospital',payload:{hospital:'연동 검수 병원',phone:'01000000000',specialty:'내과'}});
record('hiring request saved',hiring.status,201);
record('hiring request links CRM',!!one('SELECT id FROM recruitment_cases WHERE consultation_id=?',hiring.data.id),true);
record('SMS number normalized',deliveries.find(x=>x.url.includes('solapi'))?.body.messages[0].to,'01000000000');
env.RESEND_API_KEY='test';env.RESEND_FROM='test@example.invalid';
const resetRequest={requestType:'password',email:signup.email};
record('password recovery accepted',(await call('/api/account-recovery','',resetRequest)).status,202);
const email=deliveries.find(x=>x.url.includes('resend'));
const token=email?.body.html.match(/token=([a-f0-9]{64})/)?.[1];
record('password recovery creates a link',!!token,true);
const delivered=deliveries.length;await call('/api/account-recovery','',resetRequest);record('duplicate recovery does not resend',deliveries.length,delivered);
const resets=await Promise.all(['New-pass-2026-A','New-pass-2026-B'].map(password=>call('/api/account-recovery','',{action:'reset_password',token,password})));
record('reset token is single-use under concurrent submit',resets.filter(x=>x.status===200).length,1);
record('used reset token cannot be reused',(await call('/api/account-recovery','',{action:'reset_password',token,password:'New-pass-2026-C'})).status,400);
record('reset revokes old sessions',(await call('/api/account','other')).data.signedIn,false);
record('old password fails',(await call('/api/auth/login','',{email:signup.email,password:signup.password})).status,401);
const newLogin=await call('/api/auth/login','',{email:signup.email,password:resets[0].status===200?'New-pass-2026-A':'New-pass-2026-B'});cookies.other=newLogin.cookie;record('new password signs in',newLogin.status,200);
record('successful reset invalidates all old links',one('SELECT COUNT(*) n FROM account_password_resets WHERE used_at IS NULL').n,0);
// Older live DBs created at runtime already contain the optional timestamp column.
sqlite.exec('ALTER TABLE auth_credentials ADD COLUMN password_changed_at TEXT');
sqlite.exec("UPDATE account_recovery_requests SET created_at=datetime('now','-10 minutes')");
const modernDeliveryStart=deliveries.length;
await call('/api/account-recovery','',resetRequest);
const modernToken=deliveries.slice(modernDeliveryStart).find(x=>x.url.includes('resend'))?.body.html.match(/token=([a-f0-9]{64})/)?.[1];
record('reset also supports runtime-created schema',(await call('/api/account-recovery','',{action:'reset_password',token:modernToken,password:'Modern-pass-2026-A'})).status,200);
record('optional password timestamp updated',!!one('SELECT password_changed_at FROM auth_credentials WHERE email_normalized=?',signup.email)?.password_changed_at,true);
const modernLogin=await call('/api/auth/login','',{email:signup.email,password:'Modern-pass-2026-A'});
if (!modernLogin.cookie) throw new Error('Modern schema login fixture did not establish a session');
cookies.other=modernLogin.cookie;
globalThis.fetch=originalFetch;delete env.RESEND_API_KEY;delete env.RESEND_FROM;delete env.SOLAPI_API_KEY;delete env.SOLAPI_API_SECRET;
// Every route returns a useful document, while unknown API paths fail explicitly.
for(const path of ['/','/jobs','/medical-staff','/headhunting','/advertise','/resume','/signup/doctor','/signup/hospital','/privacy','/terms','/refund','/account/recovery'])record('route '+path,(await call(path)).status,200);
record('unknown API reports 404',(await call('/api/not-a-real-route')).status,404);
record('favorite saved',(await call('/api/saved-jobs','doctor',{jobId:'admin-'+ad.contentRecordId})).data.saved,true);
record('favorite survives reload',(await call('/api/saved-jobs','doctor')).data.saved.includes('admin-'+ad.contentRecordId),true);
record('other member favorite list isolated',(await call('/api/saved-jobs','other')).data.saved.includes('admin-'+ad.contentRecordId),false);
record('favorite removed',(await call('/api/saved-jobs','doctor',{jobId:'admin-'+ad.contentRecordId})).data.saved,false);
sqlite.prepare("INSERT OR REPLACE INTO member_registration_profiles (account_id,profile_json) VALUES (?,?)").run(hospitalId,JSON.stringify({department:'탈퇴 후 삭제될 가상 부서'}));
const withdrawn=await call('/api/account','hospital',undefined,'DELETE');record('billing member withdrawal',withdrawn.status,200);
record('withdrawn member sessions revoked',(await call('/api/account','hospital')).data.signedIn,false);
record('withdrawn registration details removed',!!one('SELECT account_id FROM member_registration_profiles WHERE account_id=?',hospitalId),false);
record('withdrawal closes owned ad',one('SELECT status FROM admin_content_records WHERE id=?',ad.contentRecordId).status,'closed');
record('withdrawal preserves billing records',one('SELECT COUNT(*) n FROM payment_orders WHERE account_id=?',hospitalId).n>0,true);
record('doctor withdrawal',(await call('/api/account','doctor',undefined,'DELETE')).status,200);
record('withdrawal removes private unused photo',objects.has(unused.data.key),false);
record('withdrawal preserves previously submitted photo',objects.has(photo.data.key),true);
record('withdrawal clears private resumes',one('SELECT COUNT(*) n FROM resumes WHERE account_id=?',doctorId).n,0);
const otherId=one("SELECT account_id id FROM auth_credentials WHERE email_normalized='integration-doctor@example.invalid'").id;
await env.BACKUPS.put('profiles/'+otherId+'/old-unreferenced.png',png);
objects.get('profiles/'+otherId+'/old-unreferenced.png').uploaded=new Date('2000-01-01');
await env.BACKUPS.put('profiles/'+otherId+'/fresh-draft.png',png);
await env.BACKUPS.put('hospitals/'+hospitalId+'/public-banner.png',png);
const expiredDocument='verifications/hospitals/'+hospitalId+'/expired.pdf';
await env.BACKUPS.put(expiredDocument,new TextEncoder().encode('%PDF-synthetic'));
sqlite.prepare("INSERT INTO hospital_verification_requests (id,account_id,document_key,content_type,retention_until) VALUES (?,?,?,'application/pdf','2000-01-01 00:00:00')").run('expired-verification',hospitalId,expiredDocument);
for (const [id,until] of [['unknown-expiry','invalid-date'],['future-iso','2099-01-01T00:00:00Z']]) {
  const key='verifications/hospitals/'+hospitalId+'/'+id+'.pdf';
  await env.BACKUPS.put(key,new TextEncoder().encode('%PDF-synthetic'));
  sqlite.prepare("INSERT INTO hospital_verification_requests (id,account_id,document_key,content_type,retention_until) VALUES (?,?,?,'application/pdf',?)").run(id,hospitalId,key,until);
}
const originalDelete=env.BACKUPS.delete;
env.BACKUPS.delete=async key=>{if(String(key).includes('old-unreferenced'))throw new Error('SYNTHETIC_STORAGE_DELETE_FAILURE');return originalDelete(key);};
async function protection(){delete globalThis.__mhProtectionDate;const pending=[];await worker.fetch(new Request('https://audit.local/api/account'),env,{waitUntil:p=>pending.push(p)});await Promise.all(pending);}
await protection();record('failed cleanup preserves retryable object',objects.has('profiles/'+otherId+'/old-unreferenced.png'),true);
record('failed cleanup recorded',one("SELECT COUNT(*) n FROM data_protection_runs WHERE run_type='retention' AND status='failed'").n>0,true);
env.BACKUPS.delete=originalDelete;await protection();
record('orphan cleanup retries successfully',objects.has('profiles/'+otherId+'/old-unreferenced.png'),false);
record('fresh upload draft preserved',objects.has('profiles/'+otherId+'/fresh-draft.png'),true);
record('public banner unaffected by private cleanup',objects.has('hospitals/'+hospitalId+'/public-banner.png'),true);
record('submitted photo survives daily retention',objects.has(photo.data.key),true);
record('expired verification file deleted',objects.has(expiredDocument),false);
record('expired verification record deleted',!!one('SELECT id FROM hospital_verification_requests WHERE id=?','expired-verification'),false);
record('unparseable expiry is not destructively guessed',objects.has('verifications/hospitals/'+hospitalId+'/unknown-expiry.pdf'),true);
record('future ISO expiry is preserved',objects.has('verifications/hospitals/'+hospitalId+'/future-iso.pdf'),true);
record('foreign keys intact',sqlite.prepare('PRAGMA foreign_key_check').all().length,0);
console.log(JSON.stringify({checks:output,sqlErrors,summary:{passed:output.filter(x=>x.pass).length,failed:output.filter(x=>!x.pass).length}},null,2));
if(output.some(x=>!x.pass))process.exitCode=1;
