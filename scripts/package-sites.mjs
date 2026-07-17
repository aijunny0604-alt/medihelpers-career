import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { accountSchemaStatements, consultationSchemaStatements } from '../db/schema.js';

const sourceDir = 'client-build';
const html = await readFile(path.join(sourceDir, 'index.html'), 'utf8');
const cssMatch = html.match(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
const jsMatch = html.match(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/);
if (!cssMatch || !jsMatch) throw new Error('Vite assets were not found');
const cssPath = cssMatch[1];
const jsPath = jsMatch[1];
const css = await readFile(path.join(sourceDir, cssPath.replace(/^\//, '')), 'utf8');
const js = await readFile(path.join(sourceDir, jsPath.replace(/^\//, '')), 'utf8');
const logoSvg = await readFile(path.join(sourceDir, 'medihelpers-logo.svg'), 'utf8');
const ogBase64 = (await readFile(path.join(sourceDir, 'og-medihelpers.jpg'))).toString('base64');
const faviconBase64 = (await readFile(path.join(sourceDir, 'favicon.png'))).toString('base64');
const appleIconBase64 = (await readFile(path.join(sourceDir, 'apple-touch-icon.png'))).toString('base64');
const samcheonpoBrandBase64 = (await readFile(path.join(sourceDir, 'samcheonpo-jeil-brand-mark.png'))).toString('base64');
const samcheonpoHorizontalLogoBase64 = (await readFile(path.join(sourceDir, 'samcheonpo-jeil-horizontal-logo-v2.png'))).toString('base64');
const isarangBrandBase64 = (await readFile(path.join(sourceDir, 'isarang-children-brand-mark.png'))).toString('base64');
const isarangBannerBase64 = (await readFile(path.join(sourceDir, 'isarang-children-recruitment-banner-v2.png'))).toString('base64');
const mediAngelBase64 = (await readFile(path.join(sourceDir, 'assets', 'medi-angel-assistant-v2.png'))).toString('base64');

await rm('dist', { recursive: true, force: true });
await mkdir('dist/server', { recursive: true });
await mkdir('dist/.openai', { recursive: true });
await cp('.openai/hosting.json', 'dist/.openai/hosting.json');
await cp('drizzle', 'dist/.openai/drizzle', { recursive: true });
const server = `const html = ${JSON.stringify(html)};
const css = ${JSON.stringify(css)};
const js = ${JSON.stringify(js)};
const logoSvg = ${JSON.stringify(logoSvg)};
const ogBase64 = ${JSON.stringify(ogBase64)};
const faviconBase64 = ${JSON.stringify(faviconBase64)};
const appleIconBase64 = ${JSON.stringify(appleIconBase64)};
const samcheonpoBrandBase64 = ${JSON.stringify(samcheonpoBrandBase64)};
const samcheonpoHorizontalLogoBase64 = ${JSON.stringify(samcheonpoHorizontalLogoBase64)};
const isarangBrandBase64 = ${JSON.stringify(isarangBrandBase64)};
const isarangBannerBase64 = ${JSON.stringify(isarangBannerBase64)};
const mediAngelBase64 = ${JSON.stringify(mediAngelBase64)};
const cssPath = ${JSON.stringify(cssPath)};
const jsPath = ${JSON.stringify(jsPath)};
const accountSchemaStatements = ${JSON.stringify(accountSchemaStatements)};
const consultationSchemaStatements = ${JSON.stringify(consultationSchemaStatements)};
const termsVersion = 'signup-terms-draft-2026-07-16';
const privacyNoticeVersion = 'privacy-notice-draft-2026-07-16';
function binary(base64) { return Uint8Array.from(atob(base64), value => value.charCodeAt(0)); }
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
}
function signupEnabled(env) {
  const approvedCopyEmbedded = !termsVersion.includes('draft') && !privacyNoticeVersion.includes('draft');
  const accountSecretReady = env && typeof env.ACCOUNT_HASH_SECRET === 'string' && env.ACCOUNT_HASH_SECRET.length >= 32;
  return approvedCopyEmbedded && accountSecretReady && env.SIGNUP_ENABLED === 'true' && env.LEGAL_DOCUMENT_STATUS === 'approved';
}
function authenticatedUser(request) {
  const email = (request.headers.get('oai-authenticated-user-email') || '').trim().toLowerCase();
  if (!email) return null;
  let displayName = '';
  if (request.headers.get('oai-authenticated-user-full-name-encoding') === 'percent-encoded-utf-8') {
    try { displayName = decodeURIComponent(request.headers.get('oai-authenticated-user-full-name') || ''); } catch { displayName = ''; }
  }
  return { email, displayName };
}
async function userKey(email, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(email));
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
}
async function ensureAccountSchema(env) {
  if (!env || !env.DB) throw new Error('ACCOUNT_DB_UNAVAILABLE');
  await env.DB.batch(accountSchemaStatements.map(statement => env.DB.prepare(statement)));
}
async function ensureConsultationSchema(env) {
  if (!env || !env.DB) throw new Error('CONSULTATION_DB_UNAVAILABLE');
  await env.DB.batch(consultationSchemaStatements.map(statement => env.DB.prepare(statement)));
}
function adminIdentity(request, env) {
  const identity = authenticatedUser(request);
  const allowed = String(env.ADMIN_EMAILS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  return identity && allowed.includes(identity.email) ? identity : null;
}
function cleanConsultationPayload(payload) {
  const allowed = ['name','phone','professionalType','specialty','gender','birthYear','email','region','workType','startTiming','hospital','manager','address','salary','preferredAge','preferredGender','fellowship','experienceRequired','schedule','scale','contactTime','attachmentName','message'];
  return Object.fromEntries(allowed.filter(key => typeof payload[key] === 'string').map(key => [key, payload[key].trim().slice(0, key === 'message' ? 3000 : 300)]));
}
function escapeHtml(value) {
  return String(value || '').replace(/[&<>\"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' })[character]);
}
async function sendConsultationEmail(env, record) {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM || !env.ALERT_EMAIL_TO) return 'not_configured';
  const label = record.requestType === 'doctor' ? '의사 구직희망' : '병원 구인희망';
  const details = Object.entries(record.payload).filter(([, value]) => value).map(([key, value]) => '<tr><th style="padding:8px;text-align:left;background:#f3f7fb">'+escapeHtml(key)+'</th><td style="padding:8px">'+escapeHtml(value)+'</td></tr>').join('');
  const response = await fetch('https://api.resend.com/emails', { method:'POST', headers:{ authorization:'Bearer '+env.RESEND_API_KEY, 'content-type':'application/json' }, body:JSON.stringify({ from:env.RESEND_FROM, to:[env.ALERT_EMAIL_TO], subject:'[메디헬퍼스] 새 '+label+' 상담 '+record.id, html:'<h2>새 상담 신청이 접수되었습니다.</h2><p><b>접수번호:</b> '+escapeHtml(record.id)+'</p><table style="border-collapse:collapse;width:100%">'+details+'</table><p>관리자 상담함에서 처리 상태를 관리해 주세요.</p>' }) });
  if (!response.ok) throw new Error('EMAIL_'+response.status);
  return 'sent';
}
async function hmacHex(secret, value) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2,'0')).join('');
}
async function sendConsultationSms(env, record) {
  if (!env.SOLAPI_API_KEY || !env.SOLAPI_API_SECRET || !env.SOLAPI_SENDER || !env.ALERT_SMS_TO) return 'not_configured';
  const date = new Date().toISOString();
  const salt = crypto.randomUUID();
  const signature = await hmacHex(env.SOLAPI_API_SECRET, date + salt);
  const label = record.requestType === 'doctor' ? '의사 구직' : '병원 구인';
  const text = '[메디헬퍼스] 새 '+label+' 상담 '+record.id+' / '+record.requesterName+' / '+record.phone;
  const response = await fetch('https://api.solapi.com/messages/v4/send-many/detail', { method:'POST', headers:{ authorization:'HMAC-SHA256 apiKey='+env.SOLAPI_API_KEY+', date='+date+', salt='+salt+', signature='+signature, 'content-type':'application/json' }, body:JSON.stringify({ messages:[{ to:String(env.ALERT_SMS_TO).replace(/\D/g,''), from:String(env.SOLAPI_SENDER).replace(/\D/g,''), text }] }) });
  if (!response.ok) throw new Error('SMS_'+response.status);
  return 'sent';
}
async function consultationApi(request, env, pathname) {
  try { await ensureConsultationSchema(env); } catch { return json({ error:'상담 데이터 저장소를 사용할 수 없습니다.' }, 503); }
  if (request.method === 'POST' && pathname === '/api/consultations') {
    if (!sameOrigin(request)) return json({ error:'허용되지 않은 요청입니다.' }, 403);
    const identity = authenticatedUser(request);
    if (!identity) return json({ error:'상담 신청은 로그인 후 이용할 수 있습니다.' }, 401);
    const length = Number(request.headers.get('content-length') || 0);
    if (length > 65536) return json({ error:'입력 내용이 너무 큽니다.' }, 413);
    let body;
    try { body = await request.json(); } catch { return json({ error:'입력 내용을 확인해 주세요.' }, 400); }
    const requestType = body.requestType;
    const payload = cleanConsultationPayload(body.payload || {});
    const requesterName = requestType === 'doctor' ? payload.name : payload.hospital;
    if (!['doctor','hospital'].includes(requestType) || !requesterName || !payload.phone || !payload.specialty) return json({ error:'필수 정보를 모두 입력해 주세요.' }, 400);
    const id = (requestType === 'doctor' ? 'SEEK-' : 'HIRE-') + Date.now().toString(36).toUpperCase() + crypto.randomUUID().slice(0,4).toUpperCase();
    await env.DB.prepare('INSERT INTO consultation_requests (id, request_type, requester_name, phone, email, specialty, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id, requestType, requesterName, payload.phone, payload.email || '', payload.specialty, JSON.stringify(payload)).run();
    const record = { id, requestType, requesterName, phone:payload.phone, payload };
    let emailStatus = 'failed'; let smsStatus = 'failed';
    try { emailStatus = await sendConsultationEmail(env, record); } catch { emailStatus = 'failed'; }
    try { smsStatus = await sendConsultationSms(env, record); } catch { smsStatus = 'failed'; }
    await env.DB.prepare('UPDATE consultation_requests SET email_notification_status = ?, sms_notification_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(emailStatus, smsStatus, id).run();
    return json({ id, saved:true, notifications:{ email:emailStatus, sms:smsStatus } }, 201);
  }
  const admin = adminIdentity(request, env);
  if (!admin) return json({ error:'관리자 로그인이 필요합니다.' }, 401);
  if (request.method === 'GET' && pathname === '/api/consultations') {
    const result = await env.DB.prepare('SELECT id, request_type AS requestType, requester_name AS requesterName, phone, email, specialty, payload_json AS payloadJson, status, admin_note AS adminNote, email_notification_status AS emailNotificationStatus, sms_notification_status AS smsNotificationStatus, created_at AS createdAt, updated_at AS updatedAt FROM consultation_requests ORDER BY created_at DESC LIMIT 200').all();
    const requests = (result.results || []).map(row => { let payload = {}; try { payload = JSON.parse(row.payloadJson || '{}'); } catch {} const { payloadJson, ...rest } = row; return { ...rest, payload }; });
    return json({ admin, requests });
  }
  const match = pathname.match(/^\\/api\\/consultations\\/([^\\/]+)$/);
  if (request.method === 'PATCH' && match) {
    if (!sameOrigin(request)) return json({ error:'허용되지 않은 요청입니다.' }, 403);
    let body; try { body = await request.json(); } catch { return json({ error:'입력 내용을 확인해 주세요.' }, 400); }
    if (!['new','contacted','in_progress','closed'].includes(body.status)) return json({ error:'처리 상태를 확인해 주세요.' }, 400);
    const note = typeof body.adminNote === 'string' ? body.adminNote.trim().slice(0,2000) : '';
    await env.DB.prepare('UPDATE consultation_requests SET status = ?, admin_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(body.status, note, decodeURIComponent(match[1])).run();
    return json({ updated:true });
  }
  return json({ error:'지원하지 않는 요청입니다.' }, 405);
}
function sameOrigin(request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}
async function accountApi(request, env) {
  const enabled = signupEnabled(env);
  const identity = authenticatedUser(request);
  if (request.method === 'GET') {
    if (!enabled) return json({ signupEnabled: false, signedIn: Boolean(identity), account: null, identity: identity || {} });
    if (!identity) return json({ signupEnabled: true, signedIn: false, account: null, identity: {} });
    try { await ensureAccountSchema(env); } catch { return json({ error: '회원 데이터 저장소를 사용할 수 없습니다.' }, 503); }
    const key = await userKey(identity.email, env.ACCOUNT_HASH_SECRET);
    const row = await env.DB.prepare('SELECT role, created_at AS createdAt FROM accounts WHERE user_key = ?').bind(key).first();
    return json({ signupEnabled: true, signedIn: true, account: row || null, identity });
  }
  if (!sameOrigin(request)) return json({ error: '허용되지 않은 요청입니다.' }, 403);
  if (!enabled) return json({ error: '회원가입은 법무 검토 완료 후 열립니다.' }, 503);
  if (!identity) return json({ error: '계정 인증이 필요합니다.' }, 401);
  try { await ensureAccountSchema(env); } catch { return json({ error: '회원 데이터 저장소를 사용할 수 없습니다.' }, 503); }
  const key = await userKey(identity.email, env.ACCOUNT_HASH_SECRET);
  if (request.method === 'POST') {
    const length = Number(request.headers.get('content-length') || 0);
    if (length > 4096) return json({ error: '요청 크기가 너무 큽니다.' }, 413);
    let body;
    try { body = await request.json(); } catch { return json({ error: '올바른 가입 정보를 보내주세요.' }, 400); }
    if (!['doctor', 'hospital'].includes(body.role) || body.termsAccepted !== true || body.ageConfirmed !== true || body.privacyAcknowledged !== true) {
      return json({ error: '회원 유형과 필수 약관·안내를 확인해주세요.' }, 400);
    }
    const newId = crypto.randomUUID();
    await env.DB.prepare("INSERT INTO accounts (id, user_key, role) VALUES (?, ?, ?) ON CONFLICT(user_key) DO UPDATE SET role = excluded.role, updated_at = CURRENT_TIMESTAMP").bind(newId, key, body.role).run();
    const account = await env.DB.prepare('SELECT id, role, created_at AS createdAt FROM accounts WHERE user_key = ?').bind(key).first();
    const records = [
      ['terms', termsVersion],
      ['age_confirmation', termsVersion],
      ['privacy_notice_ack', privacyNoticeVersion]
    ].map(([type, version]) => env.DB.prepare('INSERT OR IGNORE INTO consent_records (id, account_id, consent_type, document_version) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), account.id, type, version));
    await env.DB.batch(records);
    return json({ account: { role: account.role, createdAt: account.createdAt } }, 201);
  }
  if (request.method === 'DELETE') {
    const account = await env.DB.prepare('SELECT id FROM accounts WHERE user_key = ?').bind(key).first();
    if (account) await env.DB.batch([
      env.DB.prepare('DELETE FROM consent_records WHERE account_id = ?').bind(account.id),
      env.DB.prepare('DELETE FROM accounts WHERE id = ?').bind(account.id)
    ]);
    return json({ deleted: true });
  }
  return json({ error: '지원하지 않는 요청입니다.' }, 405);
}
async function responseFor(request, env) {
  const pathname = new URL(request.url).pathname;
  if (pathname === '/api/account') return accountApi(request, env);
  if (pathname === '/api/consultations' || pathname.startsWith('/api/consultations/')) return consultationApi(request, env, pathname);
  if (pathname === cssPath) return new Response(css, { status: 200, headers: { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'public, max-age=31536000, immutable' } });
  if (pathname === jsPath) return new Response(js, { status: 200, headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'public, max-age=31536000, immutable' } });
  if (pathname === '/medihelpers-logo.svg') return new Response(logoSvg, { status: 200, headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'public, max-age=31536000, immutable' } });
  if (pathname === '/og-medihelpers.jpg') return new Response(binary(ogBase64), { status: 200, headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=86400' } });
  if (pathname === '/favicon.png') return new Response(binary(faviconBase64), { status: 200, headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=31536000, immutable' } });
  if (pathname === '/apple-touch-icon.png') return new Response(binary(appleIconBase64), { status: 200, headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=31536000, immutable' } });
  if (pathname === '/samcheonpo-jeil-brand-mark.png') return new Response(binary(samcheonpoBrandBase64), { status: 200, headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=31536000, immutable' } });
  if (pathname === '/samcheonpo-jeil-horizontal-logo-v2.png') return new Response(binary(samcheonpoHorizontalLogoBase64), { status: 200, headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=31536000, immutable' } });
  if (pathname === '/isarang-children-brand-mark.png') return new Response(binary(isarangBrandBase64), { status: 200, headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=31536000, immutable' } });
  if (pathname === '/isarang-children-recruitment-banner-v2.png') return new Response(binary(isarangBannerBase64), { status: 200, headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=31536000, immutable' } });
  if (pathname === '/assets/medi-angel-assistant-v2.png') return new Response(binary(mediAngelBase64), { status: 200, headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=31536000, immutable' } });
  if (!pathname.includes('.')) return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60' } });
  return new Response('Not Found', { status: 404 });
}
export default { async fetch(request, env) { return responseFor(request, env); } };
export const buildId = 'medihelpers-static';
export const hasMiddleware = false;
export const pageRoutes = [{ pattern: '/', patternParts: [], isDynamic: false, params: [] }];
export const vinextConfig = { basePath: '', assetPrefix: '', trailingSlash: false, redirects: [], rewrites: { beforeFiles: [], afterFiles: [], fallback: [] }, headers: [], i18n: null, images: {} };
export function normalizeDataRequest(request) { return { request, normalizedPathname: new URL(request.url).pathname, isDataReq: false }; }
export function matchPageRoute(url) { const pathname = new URL(url, 'https://site.local').pathname; return !pathname.includes('.') ? { route: pageRoutes[0], params: {} } : null; }
export function matchApiRoute() { return null; }
export async function runMiddleware() { return { continue: true }; }
export async function handleApiRoute() { return new Response('Not Found', { status: 404 }); }
export async function renderPage(request, url) { const pathname = new URL(url, request.url).pathname; if (pathname.includes('.')) return new Response('Not Found', { status: 404 }); return responseFor(new Request(new URL(pathname, request.url))); }
`;
await writeFile('dist/server/index.js', server, 'utf8');
