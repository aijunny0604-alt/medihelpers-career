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
// Account bootstrap probes optional tables before the existing lazy migrations.
// Cold-start migration coverage lives in runtime-integration-audit; this suite
// isolates purchase and detail behavior after the account/admin schemas exist.
await call('/api/member-center', 'hospital');
await call('/api/admin-console', 'admin');
sqlErrors.length = 0;
const second = await call('/api/auth/register', '', { ...consent, email: 'talent-owner@example.invalid', password: 'Local-talent-audit-2026!', role: 'doctor', displayName: '가상 구직자', phone: '01000000000', professionType: '의사', termsAccepted: true, privacyAcknowledged: true, ageConfirmed: true });
cookies.other = second.cookie;
record('separate résumé owner', second.status, 201);
async function createPost(title, visibility = 'ticket') {
  const resume = await call('/api/resumes', 'other', { ...consent, createNew: true, title, name: '가상 구직자', phone: '01000000000', email: 'talent-owner@example.invalid', profession: '의사', specialty: '내과', desiredRegions: '서울', detail: { experienceYears: '8년', introduction: title + ' — 실제 회원 정보가 아닌 로컬 시험 자료입니다.', skills: '내과 외래, 건강검진', careers: [{ institution: '가상 검수병원', department: '내과', duties: '외래 진료' }] } });
  if (resume.status !== 201) throw Error('Fixture résumé failed');
  const post = await call('/api/job-seeker-posts', 'other', { ...consent, publicationAcknowledged: true, contactConsent: visibility === 'ticket', resumeId: resume.data.id, title, contactVisibility: visibility });
  if (post.status !== 201) throw Error('Fixture post failed');
  return { id: post.data.post.id, resumeId: resume.data.id, talentId: 'seeker-' + post.data.post.id };
}
const detailPath = p => '/api/talent-detail/' + p.talentId;
const buy = (productId, talentId, role = 'hospital') => call('/api/payment-orders', role, { ...consent, checkoutAcknowledged: true, productId, metadata: { talentId } });
const approve = order => call('/api/payment-approve', 'hospital', { orderNumber: order.orderNumber });
const usage = () => one('SELECT COALESCE(SUM(used_credits),0) n FROM talent_credit_pools').n;
const ticket = await createPost('공개 연락처 열람 시험');
const privatePost = await createPost('비공개 연락처 열람 시험', 'private');
record('anonymous never receives detail', (await call(detailPath(ticket))).data.detail, null);
record('other doctor cannot unlock', (await call(detailPath(ticket), 'doctor')).data.unlocked, false);
record('doctor cannot purchase a hospital ticket', (await buy('talent-unlock-single', ticket.talentId, 'doctor')).status, 403);
record('author sees own résumé free', (await call(detailPath(ticket), 'other')).data.accessReason, 'owner');
record('admin sees actual saved résumé', (await call(detailPath(ticket), 'admin')).data.accessReason, 'admin');
record('hospital without ticket is locked', (await call(detailPath(ticket), 'hospital')).data.unlocked, false);
const single = await buy('talent-unlock-single', ticket.talentId);
record('targeted single order created', single.status, 201);
record('pending order does not unlock', (await call(detailPath(ticket), 'hospital')).data.unlocked, false);
const paid = await approve(single.data.order);
record('virtual approval succeeds', paid.data.approved, true);
record('no actual charge in local test', paid.data.testMode, true);
const opened = await call(detailPath(ticket), 'hospital');
record('single purchase opens target', opened.data.unlocked, true);
record('consenting contact reaches hospital', opened.data.detail?.phone, '01000000000');
record('saved introduction reaches detail', opened.data.detail?.detail?.introduction.includes('로컬 시험 자료'), true);
await call(detailPath(ticket), 'hospital');
record('single revisit has one grant', count('talent_unlocks'), 1);
record('duplicate single purchase rejected', (await buy('talent-unlock-single', ticket.talentId)).status, 409);
record('single purchase does not open other candidate', (await call(detailPath(privatePost), 'hospital')).data.unlocked, false);
for (const talentId of ['MH-D-2048', 'seeker-missing']) {
  record('invalid target cannot be purchased ' + talentId, (await buy('talent-unlock-single', talentId)).status, 400);
}
const pack = await buy('talent-unlock-pack', '');
record('pack approved', (await approve(pack.data.order)).data.approved, true);
record('pack grants ten credits', one('SELECT SUM(total_credits) n FROM talent_credit_pools').n, 10);
const before = usage();
record('example API has no real résumé', (await call('/api/talent-detail/MH-D-2048', 'hospital')).status, 404);
record('example cannot spend a credit', usage(), before);
const protectedDetail = await call(detailPath(privatePost), 'hospital');
record('pack opens private-contact résumé', protectedDetail.data.unlocked, true);
record('private contact remains protected', protectedDetail.data.contactProtected, true);
record('private contact omitted', protectedDetail.data.detail?.phone, '');
record('first pack view costs one', usage(), 1);
await call(detailPath(privatePost), 'hospital');
record('pack revisit does not charge again', usage(), 1);
record('hospital history includes actual target', (await call('/api/talent-unlocks', 'hospital')).data.unlocks.some(x => x.talentId === privatePost.talentId), true);
record('mypage balance matches DB', (await call('/api/member-center', 'hospital')).data.talentCredits?.remaining, 9);
await call('/api/job-seeker-posts/' + privatePost.id, 'other', undefined, 'DELETE');
record('deleted publication cannot disclose résumé', (await call(detailPath(privatePost), 'hospital')).status, 404);
record('missing publication does not spend credit', usage(), 1);
record('no unexpected SQL errors', sqlErrors.filter(x => !x.includes('duplicate column name')).length, 0);
if (sqlErrors.some(x => !x.includes('duplicate column name'))) console.error(JSON.stringify(sqlErrors));
console.log(JSON.stringify({ checks: output.length, failed: output.filter(x => !x.pass), results: output }, null, 2));
if (output.some(x => !x.pass)) process.exitCode = 1;

// Optional browser fixture; all data and payment state live only in :memory:.
if (process.argv.includes('--serve') && !process.exitCode) {
  sqlite.exec('DELETE FROM talent_unlocks; DELETE FROM talent_credit_pools;');
  const ui = [await createPost('브라우저 검수 · 연락처 공개'), await createPost('브라우저 검수 · 연락처 비공개', 'private')];
  const { createServer } = await import('node:http');
  const { existsSync } = await import('node:fs');
  const fault = new URL('../../medihelpers-audit-20260909/talent-detail-fault-enabled', import.meta.url);
  createServer(async (req, res) => {
    try {
      if (req.url.startsWith('/api/talent-detail/') && existsSync(fault)) {
        res.writeHead(503, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify({ error: 'Local simulated outage' })); return;
      }
      const chunks = []; for await (const c of req) chunks.push(c);
      const body = Buffer.concat(chunks);
      const response = await worker.fetch(new Request('http://127.0.0.1:5194' + req.url, { method: req.method, headers: req.headers, ...(body.length ? { body } : {}) }), env, {});
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) { console.error(error.message); res.writeHead(500); res.end('Local fixture error'); }
  }).listen(5194, '127.0.0.1', () => console.log(JSON.stringify({ server: 'http://127.0.0.1:5194', ui })));
}
