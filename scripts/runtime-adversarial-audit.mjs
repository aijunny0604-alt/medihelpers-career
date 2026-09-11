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
let injectedFailure = null;
function execute(statement, read=false) {
 if(injectedFailure?.test(statement.sql)) {injectedFailure=null; throw new Error('INJECTED_DB_FAILURE');}
 if(read)return {results:sqlite.prepare(statement.sql).all(...statement.args),success:true};
 const r=sqlite.prepare(statement.sql).run(...statement.args);return {success:true,meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}};
}
Statement.prototype.all=async function(){return execute(this,true)};
Statement.prototype.run=async function(){return execute(this)};
let readBarrier=null;
Statement.prototype.first=async function(column){
 const row=(await this.all()).results[0]||null;
 if(readBarrier?.pattern.test(this.sql)) {
  const b=readBarrier;b.count++;
  if(b.count===b.target)b.release();else await b.promise;
 }
 return column?row?.[column]:row;
};
const DB={prepare:sql=>new Statement(sql),batch:async statements=>{sqlite.exec('BEGIN');try{const r=statements.map(s=>execute(s,/^\s*(SELECT|PRAGMA)/i.test(s.sql)));sqlite.exec('COMMIT');return r;}catch(e){sqlite.exec('ROLLBACK');throw e;}},exec:async sql=>sqlite.exec(sql)};
const env={DB,ACCOUNT_HASH_SECRET:'audit-only-secret-never-used-outside-local-20260909',ADMIN_EMAILS:'admin@medihelpers.co.kr',SIGNUP_ENABLED:'true',LEGAL_DOCUMENT_STATUS:'approved',TEST_ACCOUNT_SWITCH_ENABLED:'true'};
const output=[];
async function call(path,role='',body,method=body?'POST':'GET') {
 // Existing positive fixtures explicitly represent a visitor accepting the current notices.
 // Negative consent cases override these values with false/null.
 if(body && typeof body === 'object' && !Array.isArray(body)) body={privacyVersion:PRIVACY_FORM_VERSION,privacyConsent:true,publicationAcknowledged:true,checkoutAcknowledged:true,contactConsent:true,...body};
 const headers={'content-type':'application/json',origin:'https://audit.local'};if(cookies[role])headers.cookie=cookies[role];
 const response=await worker.fetch(new Request('https://audit.local'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})}),env,{});
 let data;try{data=await response.json();}catch{data={};}
 return {status:response.status,data,cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
const cookies={};
function record(name,actual,expected){output.push({name,pass:actual===expected,actual,expected});}
for(const role of ['doctor','hospital','admin']){const r=await call('/api/auth/test-switch','',{key:role});cookies[role]=r.cookie;record('local login '+role,r.status,200);}

// Warm shared schema without bypassing the real Worker routes.
await call('/api/member-center','hospital');
await call('/api/admin-console','admin');
const createOrder=async(productId='talent-unlock-pack',metadata={})=>(await call('/api/payment-orders','hospital',{productId,metadata})).data.order;
const approve=order=>call('/api/payment-approve','hospital',{orderNumber:order.orderNumber});
const count=(sql,...args)=>sqlite.prepare(sql).get(...args).n;
const race=await createOrder();
const concurrent=await Promise.all(Array.from({length:8},()=>approve(race)));
record('8 concurrent approvals return success',concurrent.every(r=>r.data.approved===true),true);
record('8 concurrent approvals create one capture',count('SELECT COUNT(*) n FROM payment_transactions WHERE order_id=?',race.id),1);
record('8 concurrent approvals grant exactly ten credits',count('SELECT SUM(total_credits) n FROM talent_credit_pools WHERE order_id=?',race.id),10);
for(const state of ['cancelled','refunded','partially_refunded']) {
 const order=await createOrder();sqlite.prepare('UPDATE payment_orders SET status=? WHERE id=?').run(state,order.id);
 const r=await approve(order);record(state+' order cannot be revived',r.status,409);
 record(state+' original state preserved',sqlite.prepare('SELECT status FROM payment_orders WHERE id=?').get(order.id).status,state);
}
const interrupted=await createOrder();injectedFailure=/INSERT INTO talent_credit_pools/;
const first=await approve(interrupted);
record('grant failure is not reported as complete',first.data.approved,false);
await approve(interrupted);
record('retry repairs paid order missing credits',count('SELECT COALESCE(SUM(total_credits),0) n FROM talent_credit_pools WHERE order_id=?',interrupted.id),10);
record('repair retry does not create second capture',count('SELECT COUNT(*) n FROM payment_transactions WHERE order_id=?',interrupted.id),1);
for(const [path,role] of [['/api/resumes','doctor'],['/api/job-seeker-posts','doctor'],['/api/consultations','doctor'],['/api/payment-orders','hospital'],['/api/saved-jobs','doctor']]) {
 const r=await worker.fetch(new Request('https://audit.local'+path,{method:'POST',headers:{cookie:cookies[role],origin:'https://audit.local','content-type':'application/json'},body:'null'}),env,{});
 record('JSON null rejected '+path,r.status,400);
}
const malformed=await call('/api/talent-detail/%ZZ','hospital');record('malformed route is client error',malformed.status,400);
const longResume=await call('/api/resumes','doctor',{title:'large input',name:'test',phone:'010-0000-0000',profession:'의사',createNew:true,detail:{introduction:'가'.repeat(130000)}});
record('oversized resume rejected before storage',[400,413].includes(longResume.status),true);
record('no invalid resume JSON persisted',count('SELECT COUNT(*) n FROM resumes WHERE NOT json_valid(detail_json)'),0);
const longAd=await call('/api/payment-orders','hospital',{productId:'featured',metadata:{hospital:'test',department:'내과',address:'서울',introduction:'가'.repeat(15000)}});
record('oversized ad metadata rejected before storage',[400,413].includes(longAd.status),true);
record('no invalid order JSON persisted',count('SELECT COUNT(*) n FROM payment_orders WHERE NOT json_valid(metadata_json)'),0);
const formOrder=await createOrder();
const formResponse=await worker.fetch(new Request('https://audit.local/api/payment-approve',{method:'POST',headers:{cookie:cookies.hospital,origin:'https://audit.local','content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({orderNumber:formOrder.orderNumber})}),{...env,SITE_ORIGIN:'https://audit.local'},{});
record('form encoded payment return is processed',[200,303].includes(formResponse.status),true);

const targets=[];
for(let i=0;i<8;i++) {
 const r=await call('/api/resumes','doctor',{title:'scenario '+i,name:'Test',phone:'010-0000-0000',profession:'의사',createNew:true});
 const p=await call('/api/job-seeker-posts','doctor',{resumeId:r.data.id,title:'scenario '+i});
 targets.push('seeker-'+p.data.post.id);
}
const usedBefore=count('SELECT SUM(used_credits) n FROM talent_credit_pools');
readBarrier={pattern:/SELECT id, order_id AS orderId, total_credits/,count:0,target:8};readBarrier.promise=new Promise(resolve=>readBarrier.release=resolve);
const opened=await Promise.all(targets.map(id=>call('/api/talent-detail/'+id,'hospital')));
readBarrier=null;
record('8 distinct simultaneous views all open with enough credits',opened.filter(r=>r.data.unlocked&&r.data.detail).length,8);
record('8 distinct simultaneous views cost exactly 8',count('SELECT SUM(used_credits) n FROM talent_credit_pools')-usedBefore,8);
const sameBefore=count('SELECT SUM(used_credits) n FROM talent_credit_pools');
const reopens=await Promise.all(Array.from({length:8},()=>call('/api/talent-detail/'+targets[0],'hospital')));
record('8 repeat views return details',reopens.every(r=>r.data.unlocked&&r.data.detail),true);
record('8 repeat views do not spend',count('SELECT SUM(used_credits) n FROM talent_credit_pools'),sameBefore);
const repeatBuy=await call('/api/payment-orders','hospital',{productId:'talent-unlock-single',metadata:{talentId:targets[0]}});
record('cannot buy an already unlocked single target',repeatBuy.status,409);

async function createTarget(label){
 const r=await call('/api/resumes','doctor',{title:label,name:'Test',phone:'010-0000-0000',profession:'의사',createNew:true});
 const p=await call('/api/job-seeker-posts','doctor',{resumeId:r.data.id,title:label});return 'seeker-'+p.data.post.id;
}
const dailyTargets=[];for(let i=0;i<8;i++)dailyTargets.push(await createTarget('daily '+i));
const beforeDaily=count('SELECT SUM(used_credits) n FROM talent_credit_pools');
env.TALENT_VIEW_DAILY_LIMIT='11';
const dailyResults=await Promise.all(dailyTargets.map(id=>call('/api/talent-detail/'+id,'hospital')));
record('concurrent daily limit permits only three additional views',dailyResults.filter(r=>r.data.unlocked&&r.data.detail).length,3);
record('concurrent daily limit returns five limited responses',dailyResults.filter(r=>r.status===429).length,5);
record('limited requests never debit',count('SELECT SUM(used_credits) n FROM talent_credit_pools')-beforeDaily,3);
delete env.TALENT_VIEW_DAILY_LIMIT;
const faultTarget=await createTarget('rollback');const beforeFault=count('SELECT SUM(used_credits) n FROM talent_credit_pools');
injectedFailure=/UPDATE talent_credit_pools SET used_credits/;
record('debit failure returns retryable error',(await call('/api/talent-detail/'+faultTarget,'hospital')).status,503);
record('debit failure rolls back inserted grant',count('SELECT COUNT(*) n FROM talent_unlocks WHERE talent_id=?',faultTarget),0);
record('debit failure preserves credits',count('SELECT SUM(used_credits) n FROM talent_credit_pools'),beforeFault);
record('debit failure can retry normally',(await call('/api/talent-detail/'+faultTarget,'hospital')).data.unlocked,true);
const lastTargets=[];for(let i=0;i<8;i++)lastTargets.push(await createTarget('last '+i));
sqlite.prepare('UPDATE talent_credit_pools SET used_credits=total_credits').run();sqlite.prepare('UPDATE talent_credit_pools SET used_credits=total_credits-1 WHERE order_id=?').run(race.id);
const lastResults=await Promise.all(lastTargets.map(id=>call('/api/talent-detail/'+id,'hospital')));
record('one remaining credit gives exactly one concurrent grant',lastResults.filter(r=>r.data.unlocked&&r.data.detail).length,1);
record('credit balance never negative',count('SELECT COUNT(*) n FROM talent_credit_pools WHERE used_credits>total_credits OR used_credits<0'),0);

const deletedTarget=await createTarget('delete before approval');const targetedOrder=await createOrder('talent-unlock-single',{talentId:deletedTarget});
await call('/api/job-seeker-posts/'+deletedTarget.slice(7),'doctor',null,'DELETE');
await approve(targetedOrder);await approve(targetedOrder);
record('deleted target before payment preserves one usable credit',count('SELECT SUM(total_credits) n FROM talent_credit_pools WHERE order_id=?',targetedOrder.id),1);
record('deleted target is not granted',count('SELECT COUNT(*) n FROM talent_unlocks WHERE talent_id=?',deletedTarget),0);
const sharedTarget=await createTarget('two orders one target');
const twoOrders=await Promise.all([createOrder('talent-unlock-single',{talentId:sharedTarget}),createOrder('talent-unlock-single',{talentId:sharedTarget})]);
await Promise.all(twoOrders.map(approve));
record('two targeted purchases create one target grant',count('SELECT COUNT(*) n FROM talent_unlocks WHERE talent_id=?',sharedTarget),1);
record('second targeted purchase preserves extra usable credit',count('SELECT COALESCE(SUM(total_credits),0) n FROM talent_credit_pools WHERE order_id IN (?,?)',...twoOrders.map(o=>o.id)),1);
const batchFault=await createOrder();injectedFailure=/INSERT INTO payment_events.*SELECT/;
record('capture batch failure returns error',(await approve(batchFault)).status,500);
record('capture batch failure leaves no capture',count('SELECT COUNT(*) n FROM payment_transactions WHERE order_id=?',batchFault.id),0);
record('capture batch failure preserves unpaid state',sqlite.prepare('SELECT status FROM payment_orders WHERE id=?').get(batchFault.id).status,'pending_review');
await approve(batchFault);record('capture retry produces exactly one capture',count('SELECT COUNT(*) n FROM payment_transactions WHERE order_id=?',batchFault.id),1);
for(const body of ['[]','42','"text"','{']) {
 const r=await worker.fetch(new Request('https://audit.local/api/payment-orders',{method:'POST',headers:{cookie:cookies.hospital,origin:'https://audit.local','content-type':'application/json'},body}),env,{});record('invalid body rejected '+body,r.status,400);
}
const crossOrigin=await worker.fetch(new Request('https://audit.local/api/payment-orders',{method:'POST',headers:{cookie:cookies.hospital,origin:'https://unrelated.invalid','content-type':'application/json'},body:JSON.stringify({productId:'talent-unlock-pack'})}),env,{});record('cross-origin order rejected',crossOrigin.status,403);

const directTargets=[];
for(let i=0;i<8;i++){const target=await createTarget('prepaid limit '+i);const o=await createOrder('talent-unlock-single',{talentId:target});await approve(o);directTargets.push(target);}
const viewed=count("SELECT COUNT(DISTINCT subject_ref) n FROM access_audit_logs WHERE action='talent_unlock_view' AND datetime(created_at)>=datetime('now','-1 day')");
env.TALENT_VIEW_DAILY_LIMIT=String(viewed+2);
const directViews=await Promise.all(directTargets.map(id=>call('/api/talent-detail/'+id,'hospital')));
record('prepaid concurrent views obey daily limit',directViews.filter(r=>r.data.unlocked&&r.data.detail).length,2);
record('prepaid concurrent overflow is limited',directViews.filter(r=>r.status===429).length,6);
delete env.TALENT_VIEW_DAILY_LIMIT;
const originalFetch=globalThis.fetch;let gatewayCalls=0;
globalThis.fetch=async()=>{gatewayCalls++;return new Response(JSON.stringify({resultCode:'0000',TotPrice:29000,tid:'mock-tid'}),{headers:{'content-type':'application/json'}})};
const liveEnv={...env,INICIS_MID:'local-mock-only',INICIS_SIGN_KEY:'local-mock-only'};
async function mockApproval(url) {
 const order=await createOrder();
 return worker.fetch(new Request('https://audit.local/api/payment-approve',{method:'POST',headers:{cookie:cookies.hospital,origin:'https://audit.local','content-type':'application/json'},body:JSON.stringify({orderNumber:order.orderNumber,authToken:'mock-only',authUrl:url})}),liveEnv,{});
}
const badHost=await mockApproval('https://attacker-inicisXcom/approve');
record('lookalike payment host blocked',badHost.status,400);
record('lookalike host receives no outbound request',gatewayCalls,0);
const missingOid=await mockApproval('https://audit.inicis.com/approve');record('approval without matching order ID rejected',missingOid.status,400);
globalThis.fetch=originalFetch;
console.log(JSON.stringify({checks:output,failed:output.filter(r=>!r.pass)},null,2));
if(output.some(r=>!r.pass))process.exitCode=1;
