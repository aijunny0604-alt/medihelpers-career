import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { accountSchemaStatements, adminConsoleSchemaStatements, consultationSchemaStatements, memberCenterSchemaStatements, recruitmentCrmSchemaStatements } from '../db/schema.js';

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
const memberCenterSchemaStatements = ${JSON.stringify(memberCenterSchemaStatements)};
const recruitmentCrmSchemaStatements = ${JSON.stringify(recruitmentCrmSchemaStatements)};
const adminConsoleSchemaStatements = ${JSON.stringify(adminConsoleSchemaStatements)};
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
async function ensureMemberCenterSchema(env) {
  if (!env || !env.DB) throw new Error('MEMBER_CENTER_DB_UNAVAILABLE');
  await env.DB.batch(memberCenterSchemaStatements.map(statement => env.DB.prepare(statement)));
}
async function ensureRecruitmentCrmSchema(env) {
  if (!env || !env.DB) throw new Error('RECRUITMENT_CRM_DB_UNAVAILABLE');
  await env.DB.batch(recruitmentCrmSchemaStatements.map(statement => env.DB.prepare(statement)));
}
async function ensureAdminConsoleSchema(env) {
  if (!env || !env.DB) throw new Error('ADMIN_CONSOLE_DB_UNAVAILABLE');
  await env.DB.batch(adminConsoleSchemaStatements.map(statement => env.DB.prepare(statement)));
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
    if (requestType === 'hospital') {
      try {
        await ensureRecruitmentCrmSchema(env);
        const caseId = 'CASE-' + Date.now().toString(36).toUpperCase() + crypto.randomUUID().slice(0,4).toUpperCase();
        await env.DB.prepare('INSERT INTO recruitment_cases (id, consultation_id, hospital_name, specialty, position_title, next_action) VALUES (?, ?, ?, ?, ?, ?)').bind(caseId, id, payload.hospital, payload.specialty, payload.specialty + ' 의사 초빙', '병원 채용조건 확인').run();
      } catch {}
    }
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
  const isAdmin = Boolean(adminIdentity(request, env));
  if (request.method === 'GET') {
    if (!enabled) return json({ signupEnabled: false, signedIn: Boolean(identity), account: null, identity: identity || {}, isAdmin });
    if (!identity) return json({ signupEnabled: true, signedIn: false, account: null, identity: {}, isAdmin: false });
    try { await ensureAccountSchema(env); } catch { return json({ error: '회원 데이터 저장소를 사용할 수 없습니다.' }, 503); }
    const key = await userKey(identity.email, env.ACCOUNT_HASH_SECRET);
    const row = await env.DB.prepare('SELECT role, created_at AS createdAt FROM accounts WHERE user_key = ?').bind(key).first();
    return json({ signupEnabled: true, signedIn: true, account: row || null, identity, isAdmin });
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
function cleanMemberProfile(profile) {
  const source = profile && typeof profile === 'object' ? profile : {};
  const clean = key => typeof source[key] === 'string' ? source[key].trim().slice(0, 160) : '';
  return { displayName: clean('displayName'), phone: clean('phone'), organization: clean('organization'), jobTitle: clean('jobTitle') };
}
async function memberCenterApi(request, env) {
  const identity = authenticatedUser(request);
  if (!identity) return json({ signedIn:false, account:null, identity:{} }, 401);
  if (!env.ACCOUNT_HASH_SECRET || String(env.ACCOUNT_HASH_SECRET).length < 32) return json({ error:'회원 보안 설정을 확인해주세요.' }, 503);
  try { await ensureAccountSchema(env); await ensureConsultationSchema(env); await ensureMemberCenterSchema(env); } catch { return json({ error:'회원 데이터 저장소를 사용할 수 없습니다.' }, 503); }
  const key = await userKey(identity.email, env.ACCOUNT_HASH_SECRET);
  const account = await env.DB.prepare('SELECT id, role, created_at AS createdAt FROM accounts WHERE user_key = ?').bind(key).first();
  if (!account) return json({ signedIn:true, account:null, identity });
  if (request.method === 'GET') {
    const profile = await env.DB.prepare('SELECT display_name AS displayName, phone, organization, job_title AS jobTitle, updated_at AS updatedAt FROM member_profiles WHERE account_id = ?').bind(account.id).first();
    const preferences = await env.DB.prepare('SELECT email_notifications AS email, sms_notifications AS sms, service_notifications AS service, marketing_notifications AS marketing FROM member_preferences WHERE account_id = ?').bind(account.id).first();
    const activity = await env.DB.prepare('SELECT id, event_type AS eventType, title, detail, occurred_at AS occurredAt FROM member_activity WHERE account_id = ? ORDER BY occurred_at DESC LIMIT 100').bind(account.id).all();
    const consultations = await env.DB.prepare('SELECT id, request_type AS requestType, specialty, status, created_at AS createdAt FROM consultation_requests WHERE lower(email) = ? ORDER BY created_at DESC LIMIT 100').bind(identity.email).all();
    return json({ signedIn:true, account:{ role:account.role, createdAt:account.createdAt }, identity, profile:profile || null, notifications:preferences ? { email:Boolean(preferences.email), sms:Boolean(preferences.sms), service:Boolean(preferences.service), marketing:Boolean(preferences.marketing) } : null, activity:activity.results || [], consultations:consultations.results || [] });
  }
  if (request.method === 'PATCH') {
    if (!sameOrigin(request)) return json({ error:'허용되지 않은 요청입니다.' }, 403);
    let body; try { body = await request.json(); } catch { return json({ error:'입력 내용을 확인해주세요.' }, 400); }
    const profile = cleanMemberProfile(body.profile);
    const preferences = body.notifications && typeof body.notifications === 'object' ? body.notifications : {};
    await env.DB.batch([
      env.DB.prepare('INSERT INTO member_profiles (account_id, display_name, phone, organization, job_title) VALUES (?, ?, ?, ?, ?) ON CONFLICT(account_id) DO UPDATE SET display_name=excluded.display_name, phone=excluded.phone, organization=excluded.organization, job_title=excluded.job_title, updated_at=CURRENT_TIMESTAMP').bind(account.id, profile.displayName, profile.phone, profile.organization, profile.jobTitle),
      env.DB.prepare('INSERT INTO member_preferences (account_id, email_notifications, sms_notifications, service_notifications, marketing_notifications) VALUES (?, ?, ?, ?, ?) ON CONFLICT(account_id) DO UPDATE SET email_notifications=excluded.email_notifications, sms_notifications=excluded.sms_notifications, service_notifications=excluded.service_notifications, marketing_notifications=excluded.marketing_notifications, updated_at=CURRENT_TIMESTAMP').bind(account.id, preferences.email ? 1 : 0, preferences.sms ? 1 : 0, preferences.service ? 1 : 0, preferences.marketing ? 1 : 0),
      env.DB.prepare('INSERT INTO member_activity (id, account_id, event_type, title, detail) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), account.id, 'profile_update', '회원정보를 수정했습니다.', '기본정보 또는 알림 설정 변경')
    ]);
    return json({ saved:true, profile, notifications:{ email:Boolean(preferences.email), sms:Boolean(preferences.sms), service:Boolean(preferences.service), marketing:Boolean(preferences.marketing) } });
  }
  return json({ error:'지원하지 않는 요청입니다.' }, 405);
}
async function recruitmentCrmApi(request, env, pathname) {
  const admin = adminIdentity(request, env);
  if (!admin) return json({ error:'관리자 권한이 필요합니다.' }, 401);
  try { await ensureRecruitmentCrmSchema(env); } catch { return json({ error:'채용 CRM 저장소를 사용할 수 없습니다.' }, 503); }
  if (request.method === 'GET' && pathname === '/api/recruitment-crm') {
    const result = await env.DB.prepare("SELECT c.id, c.consultation_id AS consultationId, c.hospital_name AS hospitalName, c.specialty, c.position_title AS positionTitle, c.stage, c.assigned_recruiter AS assignedRecruiter, c.success_fee_terms AS successFeeTerms, c.estimated_fee AS estimatedFee, c.next_action AS nextAction, c.billing_status AS billingStatus, c.hired_at AS hiredAt, c.created_at AS createdAt, c.updated_at AS updatedAt, COUNT(s.id) AS candidateCount FROM recruitment_cases c LEFT JOIN candidate_submissions s ON s.case_id = c.id GROUP BY c.id ORDER BY c.updated_at DESC LIMIT 300").all();
    await env.DB.prepare('INSERT INTO access_audit_logs (id, actor_key, action, metadata_json) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), admin.email, 'crm_list_view', JSON.stringify({ count:(result.results || []).length })).run();
    return json({ admin, cases:result.results || [] });
  }
  if (request.method === 'POST' && pathname === '/api/recruitment-crm') {
    if (!sameOrigin(request)) return json({ error:'허용되지 않은 요청입니다.' }, 403);
    let body; try { body = await request.json(); } catch { return json({ error:'입력 내용을 확인해 주세요.' }, 400); }
    const hospitalName = typeof body.hospitalName === 'string' ? body.hospitalName.trim().slice(0,160) : '';
    if (!hospitalName) return json({ error:'병원명을 입력해 주세요.' }, 400);
    const id = 'CASE-' + Date.now().toString(36).toUpperCase() + crypto.randomUUID().slice(0,4).toUpperCase();
    await env.DB.prepare('INSERT INTO recruitment_cases (id, hospital_name, specialty, position_title, assigned_recruiter, success_fee_terms, estimated_fee, next_action) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(id, hospitalName, String(body.specialty || '').slice(0,120), String(body.positionTitle || '').slice(0,180), String(body.assignedRecruiter || '').slice(0,120), String(body.successFeeTerms || '').slice(0,500), Math.max(0, Number(body.estimatedFee) || 0), String(body.nextAction || '병원 채용조건 확인').slice(0,300)).run();
    await env.DB.prepare('INSERT INTO access_audit_logs (id, actor_key, action, subject_ref, case_id) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), admin.email, 'crm_case_create', hospitalName, id).run();
    return json({ id, created:true }, 201);
  }
  const match = pathname.match(/^\\/api\\/recruitment-crm\\/([^\\/]+)$/);
  if (request.method === 'PATCH' && match) {
    if (!sameOrigin(request)) return json({ error:'허용되지 않은 요청입니다.' }, 403);
    let body; try { body = await request.json(); } catch { return json({ error:'입력 내용을 확인해 주세요.' }, 400); }
    const allowedStages = ['new_request','condition_review','candidate_search','candidate_consent','hospital_submitted','interview','negotiation','hired','closed'];
    if (!allowedStages.includes(body.stage)) return json({ error:'채용 단계를 확인해 주세요.' }, 400);
    const id = decodeURIComponent(match[1]);
    const hiredAt = body.stage === 'hired' ? new Date().toISOString() : null;
    await env.DB.prepare('UPDATE recruitment_cases SET stage = ?, assigned_recruiter = ?, hired_at = COALESCE(?, hired_at), updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(body.stage, String(body.assignedRecruiter || '').slice(0,120), hiredAt, id).run();
    await env.DB.prepare('INSERT INTO access_audit_logs (id, actor_key, action, subject_ref, case_id, metadata_json) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), admin.email, 'crm_stage_update', body.stage, id, JSON.stringify({ stage:body.stage })).run();
    return json({ updated:true });
  }
  return json({ error:'지원하지 않는 요청입니다.' }, 405);
}
const adminSettingKeys = ['siteName','supportPhone','supportEmail','announcement','maintenanceMode'];
const adminFeatureKeys = ['doctorRecruitment','talentSearch','resumeRegistration','medicalStaffHub','paidCareerService','adRegistration'];
const adminCategoryGroups = ['doctor_specialty','region','medical_role'];
async function writeAdminAudit(env, admin, action, subject, payload) {
  await env.DB.prepare('INSERT INTO admin_audit_logs (id, actor_email, action, subject, payload_json) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), admin.email, action, subject || '', JSON.stringify(payload || {})).run();
}
async function seedAdminConsole(env) {
  const categories = [
    ['doctor_specialty','내과','internal-medicine',10], ['doctor_specialty','정형외과','orthopedics',20],
    ['doctor_specialty','소아청소년과','pediatrics',30], ['doctor_specialty','가정의학과','family-medicine',40],
    ['region','서울','seoul',10], ['region','경기','gyeonggi',20], ['region','부산','busan',30],
    ['medical_role','간호사','nurse',10], ['medical_role','간호조무사','nursing-assistant',20],
    ['medical_role','방사선사','radiologic-technologist',30]
  ];
  const settings = {
    siteName:'메디헬퍼스', supportPhone:'051-342-5463', supportEmail:'hr@medihelpers.co.kr',
    announcement:'의사 채용·이직 전문 헤드헌팅', maintenanceMode:'false'
  };
  const features = {
    doctorRecruitment:[1,'의사 채용공고 목록과 상세 페이지'], talentSearch:[1,'병원 회원의 익명 인재 검색'],
    resumeRegistration:[1,'의사 회원 이력서 작성 및 관리'], medicalStaffHub:[0,'간호·보건 직군 확장 영역'],
    paidCareerService:[0,'유료 조건 비교·계약 분석'], adRegistration:[1,'공고 상품 신청과 검수']
  };
  const statements = categories.map(([group,name,slug,sort]) => env.DB.prepare('INSERT OR IGNORE INTO admin_categories (id, group_key, name, slug, sort_order) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), group, name, slug, sort));
  Object.entries(settings).forEach(([key,value]) => statements.push(env.DB.prepare('INSERT OR IGNORE INTO site_settings (setting_key, setting_value) VALUES (?, ?)').bind(key, value)));
  Object.entries(features).forEach(([key,[enabled,description]]) => statements.push(env.DB.prepare('INSERT OR IGNORE INTO feature_flags (flag_key, enabled, description) VALUES (?, ?, ?)').bind(key, enabled, description)));
  await env.DB.batch(statements);
}
async function adminConsoleApi(request, env) {
  const admin = adminIdentity(request, env);
  if (!admin) return json({ error:'관리자 권한이 필요합니다.' }, 403);
  try {
    await ensureAccountSchema(env);
    await ensureConsultationSchema(env);
    await ensureRecruitmentCrmSchema(env);
    await ensureAdminConsoleSchema(env);
    await seedAdminConsole(env);
  } catch {
    return json({ error:'관리자 데이터 저장소를 사용할 수 없습니다.' }, 503);
  }
  if (request.method === 'GET') {
    const [accounts, consultations, cases, categories, auditCount, settingsResult, featuresResult, categoryResult, auditResult] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) total, SUM(CASE WHEN role='doctor' THEN 1 ELSE 0 END) doctors, SUM(CASE WHEN role='hospital' THEN 1 ELSE 0 END) hospitals FROM accounts").first(),
      env.DB.prepare('SELECT COUNT(*) total FROM consultation_requests').first(),
      env.DB.prepare("SELECT SUM(CASE WHEN stage NOT IN ('hired','closed') THEN 1 ELSE 0 END) active, SUM(CASE WHEN stage='hired' THEN 1 ELSE 0 END) hired FROM recruitment_cases").first(),
      env.DB.prepare('SELECT COUNT(*) total FROM admin_categories').first(),
      env.DB.prepare('SELECT COUNT(*) total FROM admin_audit_logs').first(),
      env.DB.prepare('SELECT setting_key AS settingKey, setting_value AS settingValue FROM site_settings').all(),
      env.DB.prepare('SELECT flag_key AS flagKey, enabled FROM feature_flags').all(),
      env.DB.prepare('SELECT id, group_key AS groupKey, name, slug, sort_order AS sortOrder, enabled FROM admin_categories ORDER BY group_key, sort_order, name').all(),
      env.DB.prepare('SELECT id, actor_email AS actor, action, subject, created_at AS createdAt FROM admin_audit_logs ORDER BY created_at DESC LIMIT 100').all()
    ]);
    const settings = Object.fromEntries((settingsResult.results || []).map(row => [row.settingKey, row.settingKey === 'maintenanceMode' ? row.settingValue === 'true' : row.settingValue]));
    const features = Object.fromEntries((featuresResult.results || []).map(row => [row.flagKey, Boolean(row.enabled)]));
    return json({
      admin,
      metrics: {
        accounts:Number(accounts?.total || 0), doctors:Number(accounts?.doctors || 0), hospitals:Number(accounts?.hospitals || 0),
        consultations:Number(consultations?.total || 0), activeCases:Number(cases?.active || 0), hiredCases:Number(cases?.hired || 0),
        categories:Number(categories?.total || 0), auditLogs:Number(auditCount?.total || 0)
      },
      settings, features,
      categories:(categoryResult.results || []).map(row => ({ ...row, enabled:Boolean(row.enabled) })),
      audit:auditResult.results || []
    });
  }
  if (request.method !== 'PATCH') return json({ error:'지원하지 않는 요청입니다.' }, 405);
  if (!sameOrigin(request)) return json({ error:'허용되지 않은 요청입니다.' }, 403);
  let body;
  try { body = await request.json(); } catch { return json({ error:'입력 내용을 확인해주세요.' }, 400); }
  const action = body.action;
  const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
  if (action === 'settings_update') {
    const statements = adminSettingKeys.filter(key => Object.hasOwn(payload, key)).map(key => env.DB.prepare("INSERT INTO site_settings (setting_key, setting_value, updated_by) VALUES (?, ?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value, updated_by=excluded.updated_by, updated_at=CURRENT_TIMESTAMP").bind(key, String(payload[key]).slice(0,500), admin.email));
    if (!statements.length) return json({ error:'저장할 설정이 없습니다.' }, 400);
    await env.DB.batch(statements);
    await writeAdminAudit(env, admin, 'settings_update', '사이트 기본정보', payload);
  } else if (action === 'feature_update') {
    if (!adminFeatureKeys.includes(payload.key) || typeof payload.enabled !== 'boolean') return json({ error:'기능 설정값을 확인해주세요.' }, 400);
    await env.DB.prepare('UPDATE feature_flags SET enabled = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE flag_key = ?').bind(payload.enabled ? 1 : 0, admin.email, payload.key).run();
    await writeAdminAudit(env, admin, 'feature_update', payload.key, { enabled:payload.enabled });
  } else if (action === 'category_create') {
    const groupKey = String(payload.groupKey || '');
    const name = String(payload.name || '').trim().slice(0,80);
    const slug = String(payload.slug || '').trim().toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,80);
    if (!adminCategoryGroups.includes(groupKey) || !name || !slug) return json({ error:'카테고리 정보를 확인해주세요.' }, 400);
    await env.DB.prepare('INSERT INTO admin_categories (id, group_key, name, slug, sort_order) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), groupKey, name, slug, Math.max(0, Number(payload.sortOrder) || 0)).run();
    await writeAdminAudit(env, admin, 'category_create', name, { groupKey, slug });
  } else if (action === 'category_update') {
    const id = String(payload.id || '');
    if (!id || typeof payload.enabled !== 'boolean') return json({ error:'카테고리 상태를 확인해주세요.' }, 400);
    await env.DB.prepare('UPDATE admin_categories SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(payload.enabled ? 1 : 0, id).run();
    await writeAdminAudit(env, admin, 'category_update', id, { enabled:payload.enabled });
  } else if (action === 'category_delete') {
    const id = String(payload.id || '');
    if (!id) return json({ error:'삭제할 카테고리를 확인해주세요.' }, 400);
    await env.DB.prepare('DELETE FROM admin_categories WHERE id = ?').bind(id).run();
    await writeAdminAudit(env, admin, 'category_delete', id, {});
  } else {
    return json({ error:'지원하지 않는 관리 작업입니다.' }, 400);
  }
  return json({ saved:true });
}
async function responseFor(request, env) {
  const pathname = new URL(request.url).pathname;
  if (pathname === '/api/account') return accountApi(request, env);
  if (pathname === '/api/member-center') return memberCenterApi(request, env);
  if (pathname === '/api/consultations' || pathname.startsWith('/api/consultations/')) return consultationApi(request, env, pathname);
  if (pathname === '/api/recruitment-crm' || pathname.startsWith('/api/recruitment-crm/')) return recruitmentCrmApi(request, env, pathname);
  if (pathname === '/api/admin-console') return adminConsoleApi(request, env);
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
