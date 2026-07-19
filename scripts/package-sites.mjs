import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { accountSchemaStatements, adminConsoleSchemaStatements, commerceSchemaStatements, consultationSchemaStatements, memberCenterSchemaStatements, recruitmentCrmSchemaStatements } from '../db/schema.js';

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
const ogBase64 = (await readFile(path.join(sourceDir, 'og-medihelpers-v2.jpg'))).toString('base64');
const faviconBase64 = (await readFile(path.join(sourceDir, 'favicon.png'))).toString('base64');
const appleIconBase64 = (await readFile(path.join(sourceDir, 'apple-touch-icon.png'))).toString('base64');
const samcheonpoBrandBase64 = (await readFile(path.join(sourceDir, 'samcheonpo-jeil-brand-mark.png'))).toString('base64');
const samcheonpoHorizontalLogoBase64 = (await readFile(path.join(sourceDir, 'samcheonpo-jeil-horizontal-logo-v2.png'))).toString('base64');
const isarangBrandBase64 = (await readFile(path.join(sourceDir, 'isarang-children-brand-mark.png'))).toString('base64');
const isarangBannerBase64 = (await readFile(path.join(sourceDir, 'isarang-children-recruitment-banner-v2.png'))).toString('base64');
const mediAngelBase64 = (await readFile(path.join(sourceDir, 'assets', 'medi-angel-assistant-v2.png'))).toString('base64');
const heroPosterBase64 = (await readFile(path.join(sourceDir, 'hero-medihelpers-poster.jpg'))).toString('base64');
const heroVideoBase64 = (await readFile(path.join(sourceDir, 'hero-medihelpers.mp4'))).toString('base64');

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
const heroPosterBase64 = ${JSON.stringify(heroPosterBase64)};
const heroVideoBase64 = ${JSON.stringify(heroVideoBase64)};
const cssPath = ${JSON.stringify(cssPath)};
const jsPath = ${JSON.stringify(jsPath)};
const accountSchemaStatements = ${JSON.stringify(accountSchemaStatements)};
const consultationSchemaStatements = ${JSON.stringify(consultationSchemaStatements)};
const memberCenterSchemaStatements = ${JSON.stringify(memberCenterSchemaStatements)};
const commerceSchemaStatements = ${JSON.stringify(commerceSchemaStatements)};
const recruitmentCrmSchemaStatements = ${JSON.stringify(recruitmentCrmSchemaStatements)};
const adminConsoleSchemaStatements = ${JSON.stringify(adminConsoleSchemaStatements)};
const termsVersion = 'terms-v1.0-2026-07-18';
const privacyNoticeVersion = 'privacy-v1.0-2026-07-18';
function binary(base64) { return Uint8Array.from(atob(base64), value => value.charCodeAt(0)); }
function binaryAsset(request, base64, contentType, cacheControl = 'public, max-age=31536000, immutable') {
  const bytes = binary(base64);
  const headers = {
    'content-type': contentType,
    'cache-control': cacheControl,
    'accept-ranges': 'bytes',
    'x-content-type-options': 'nosniff'
  };
  const range = request.headers.get('range');
  if (!range) {
    headers['content-length'] = String(bytes.length);
    return new Response(bytes, { status: 200, headers });
  }
  const match = range.match(/^bytes=(\\d*)-(\\d*)$/);
  if (!match) {
    headers['content-range'] = 'bytes */' + bytes.length;
    return new Response(null, { status: 416, headers });
  }
  let start = match[1] ? Number(match[1]) : 0;
  let end = match[2] ? Number(match[2]) : bytes.length - 1;
  if (!match[1] && match[2]) {
    const suffixLength = Number(match[2]);
    start = Math.max(0, bytes.length - suffixLength);
    end = bytes.length - 1;
  }
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= bytes.length) {
    headers['content-range'] = 'bytes */' + bytes.length;
    return new Response(null, { status: 416, headers });
  }
  end = Math.min(end, bytes.length - 1);
  headers['content-range'] = 'bytes ' + start + '-' + end + '/' + bytes.length;
  headers['content-length'] = String(end - start + 1);
  return new Response(bytes.slice(start, end + 1), { status: 206, headers });
}
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers } });
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
async function ensureCommerceSchema(env) {
  if (!env || !env.DB) throw new Error('COMMERCE_DB_UNAVAILABLE');
  await env.DB.batch(commerceSchemaStatements.map(statement => env.DB.prepare(statement)));
}
async function ensureRecruitmentCrmSchema(env) {
  if (!env || !env.DB) throw new Error('RECRUITMENT_CRM_DB_UNAVAILABLE');
  await env.DB.batch(recruitmentCrmSchemaStatements.map(statement => env.DB.prepare(statement)));
}
async function ensureAdminConsoleSchema(env) {
  if (!env || !env.DB) throw new Error('ADMIN_CONSOLE_DB_UNAVAILABLE');
  await env.DB.batch(adminConsoleSchemaStatements.map(statement => env.DB.prepare(statement)));
  // 마이그레이션: 이미 생성된 admin_content_records 테이블에 sort_order가 없으면 추가(상단 고정용).
  // CREATE TABLE IF NOT EXISTS는 기존 테이블을 안 바꾸므로, 배포 이전 생성분에는 컬럼이 없어 SELECT가 실패한다.
  // '중복 컬럼' 에러는 이미 있다는 뜻이므로 무시한다.
  try { await env.DB.prepare('ALTER TABLE admin_content_records ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0').run(); } catch {}
}
function adminIdentity(request, env) {
  const identity = authenticatedUser(request);
  const allowed = String(env.ADMIN_EMAILS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  return identity && allowed.includes(identity.email) ? identity : null;
}
function cleanConsultationPayload(payload) {
  const allowed = ['name','phone','professionalType','specialty','gender','birthYear','email','region','workType','startTiming','hospital','manager','address','salary','preferredAge','preferredGender','fellowship','experienceRequired','schedule','scale','contactTime','attachmentName','message','jobId','resumeId','resumeTitle'];
  return Object.fromEntries(allowed.filter(key => typeof payload[key] === 'string').map(key => [key, payload[key].trim().slice(0, key === 'message' ? 3000 : 300)]));
}
function escapeHtml(value) {
  return String(value || '').replace(/[&<>\"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' })[character]);
}
function parseJsonObject(value) {
  try {
    const parsed = JSON.parse(value || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
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
    if (env.ACCOUNT_HASH_SECRET && String(env.ACCOUNT_HASH_SECRET).length >= 32) {
      try {
        await ensureAccountSchema(env);
        const key = await userKey(identity.email, env.ACCOUNT_HASH_SECRET);
        const account = await env.DB.prepare('SELECT role FROM accounts WHERE user_key = ?').bind(key).first();
        if (account && account.role !== requestType) return json({ error:'회원 유형과 상담 신청 유형이 일치하지 않습니다.' }, 403);
      } catch {
        return json({ error:'회원 권한을 확인할 수 없습니다.' }, 503);
      }
    }
    const id = (requestType === 'doctor' ? 'SEEK-' : 'HIRE-') + Date.now().toString(36).toUpperCase() + crypto.randomUUID().slice(0,4).toUpperCase();
    await env.DB.prepare('INSERT INTO consultation_requests (id, request_type, requester_name, phone, email, specialty, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id, requestType, requesterName, payload.phone, identity.email, payload.specialty, JSON.stringify(payload)).run();
    if (requestType === 'hospital') {
      try {
        await ensureRecruitmentCrmSchema(env);
        const caseId = 'CASE-' + Date.now().toString(36).toUpperCase() + crypto.randomUUID().slice(0,4).toUpperCase();
        await env.DB.prepare('INSERT INTO recruitment_cases (id, consultation_id, hospital_name, specialty, position_title, next_action) VALUES (?, ?, ?, ?, ?, ?)').bind(caseId, id, payload.hospital, payload.specialty, payload.specialty + ' 의사 초빙', '병원 채용조건 확인').run();
      } catch {}
    }
    // 공고 지원 알림 라우팅: 일반 병원이 올린 공고면 그 병원 계정에 알림, 아빠(admin) 인증공고면 관리자에게(기존).
    // payload.jobId로 공고를 찾아 등록자(created_by)가 병원 계정이면 그 계정의 활동(알림)에 지원자를 남긴다.
    if (requestType === 'doctor' && payload.jobId) {
      try {
        await ensureMemberCenterSchema(env);
        // 공개 목록의 공고 id는 operationalDoctorJobs에서 'admin-<uuid>' 형태 → 접두사 제거해 실제 레코드 id로 조회.
        const realJobId = String(payload.jobId).replace(/^admin-/, '');
        const jobRow = await env.DB.prepare("SELECT title, created_by AS createdBy FROM admin_content_records WHERE id=?").bind(realJobId).first();
        if (jobRow && jobRow.createdBy) {
          // 등록자가 관리자(아빠)면 병원 직접 알림 대상 아님(헤드헌터 경유). 병원 계정이면 그 병원에 알림.
          const adminList = String(env.ADMIN_EMAILS || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
          const ownerEmail = String(jobRow.createdBy).toLowerCase();
          if (!adminList.includes(ownerEmail)) {
            const ownerAccount = await env.DB.prepare('SELECT a.id FROM accounts a JOIN account_admin_profiles ap ON ap.account_id=a.id WHERE lower(ap.email)=? LIMIT 1').bind(ownerEmail).first();
            if (ownerAccount) {
              await env.DB.prepare("INSERT INTO member_activity (id, account_id, event_type, title, detail) VALUES (?, ?, 'job_application', ?, ?)").bind(crypto.randomUUID(), ownerAccount.id, ('새 지원자 · ' + (jobRow.title || '공고')).slice(0,200), (requesterName + ' · ' + payload.specialty).slice(0,300)).run();
            }
          }
        }
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
    try { await ensureAccountSchema(env); await ensureMemberCenterSchema(env); await ensureCommerceSchema(env); } catch { return json({ error: '회원 데이터 저장소를 사용할 수 없습니다.' }, 503); }
    const key = await userKey(identity.email, env.ACCOUNT_HASH_SECRET);
    const row = await env.DB.prepare('SELECT id, role, created_at AS createdAt FROM accounts WHERE user_key = ?').bind(key).first();
    if (row) await env.DB.prepare("INSERT INTO account_admin_profiles (account_id, email, full_name, last_login_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(account_id) DO UPDATE SET email=excluded.email, full_name=excluded.full_name, last_login_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP").bind(row.id, identity.email, identity.displayName || '').run();
    // 폼 자동 채움용 프로필(이름·연락처·소속). 상담·결제·공고 신청 화면에서 재입력을 줄인다.
    let profile = null;
    if (row) {
      try { profile = await env.DB.prepare('SELECT display_name AS name, phone, organization, job_title AS jobTitle FROM member_profiles WHERE account_id = ?').bind(row.id).first(); } catch { profile = null; }
    }
    return json({ signupEnabled: true, signedIn: true, account: row || null, identity, isAdmin, profile: profile || null, email: identity.email });
  }
  if (!sameOrigin(request)) return json({ error: '허용되지 않은 요청입니다.' }, 403);
  if (!enabled) return json({ error: '회원가입은 법무 검토 완료 후 열립니다.' }, 503);
  if (!identity) return json({ error: '계정 인증이 필요합니다.' }, 401);
  try { await ensureAccountSchema(env); await ensureMemberCenterSchema(env); await ensureCommerceSchema(env); } catch { return json({ error: '회원 데이터 저장소를 사용할 수 없습니다.' }, 503); }
  const key = await userKey(identity.email, env.ACCOUNT_HASH_SECRET);
  if (request.method === 'POST') {
    const length = Number(request.headers.get('content-length') || 0);
    if (length > 4096) return json({ error: '요청 크기가 너무 큽니다.' }, 413);
    let body;
    try { body = await request.json(); } catch { return json({ error: '올바른 가입 정보를 보내주세요.' }, 400); }
    if (!['doctor', 'hospital'].includes(body.role) || body.termsAccepted !== true || body.ageConfirmed !== true || body.privacyAcknowledged !== true) {
      return json({ error: '회원 유형과 필수 약관·안내를 확인해주세요.' }, 400);
    }
    // 재가입 제한(회원 탈퇴 약관 제4조): 탈퇴일로부터 30일 이내에는 재가입 불가.
    const existingAccount = await env.DB.prepare('SELECT id FROM accounts WHERE user_key = ?').bind(key).first();
    if (!existingAccount) {
      const withdrawn = await env.DB.prepare("SELECT withdrawn_at AS at, (julianday('now') - julianday(withdrawn_at)) AS days FROM withdrawn_members WHERE user_key = ?").bind(key).first();
      if (withdrawn && Number(withdrawn.days) < 30) {
        const remaining = Math.max(1, Math.ceil(30 - Number(withdrawn.days)));
        return json({ error: '회원 탈퇴 후 30일이 지난 뒤 재가입할 수 있습니다. 약 ' + remaining + '일 후 다시 시도해 주세요.', code: 'REJOIN_BLOCKED', remainingDays: remaining }, 403);
      }
    }
    const newId = crypto.randomUUID();
    await env.DB.prepare("INSERT INTO accounts (id, user_key, role) VALUES (?, ?, ?) ON CONFLICT(user_key) DO UPDATE SET role = excluded.role, updated_at = CURRENT_TIMESTAMP").bind(newId, key, body.role).run();
    const account = await env.DB.prepare('SELECT id, role, created_at AS createdAt FROM accounts WHERE user_key = ?').bind(key).first();
    // 재가입이 허용되어 새로 가입했으므로 탈퇴 이력 정리.
    await env.DB.prepare('DELETE FROM withdrawn_members WHERE user_key = ?').bind(key).run();
    await env.DB.prepare("INSERT INTO account_admin_profiles (account_id, email, full_name, status, last_login_at) VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP) ON CONFLICT(account_id) DO UPDATE SET email=excluded.email, full_name=excluded.full_name, status='active', last_login_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP").bind(account.id, identity.email, identity.displayName || '').run();
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
    if (!account) return json({ deleted:true });
    const billing = await env.DB.prepare('SELECT COUNT(*) total FROM payment_orders WHERE account_id=?').bind(account.id).first();
    // 재가입 30일 제한을 위해 탈퇴 시각 기록(개인정보 아닌 user_key 해시만).
    const markWithdrawn = env.DB.prepare("INSERT INTO withdrawn_members (user_key, withdrawn_at) VALUES (?, CURRENT_TIMESTAMP) ON CONFLICT(user_key) DO UPDATE SET withdrawn_at=CURRENT_TIMESTAMP").bind(key);
    if (Number(billing?.total || 0) > 0) {
      await env.DB.batch([
        markWithdrawn,
        env.DB.prepare("UPDATE account_admin_profiles SET status='withdrawn', email='', full_name='', updated_at=CURRENT_TIMESTAMP WHERE account_id=?").bind(account.id),
        env.DB.prepare("UPDATE member_profiles SET display_name='', phone='', organization='', job_title='', updated_at=CURRENT_TIMESTAMP WHERE account_id=?").bind(account.id)
      ]);
      return json({ deleted:true, retainedForBilling:true });
    }
    await env.DB.batch([
      markWithdrawn,
      env.DB.prepare('DELETE FROM consent_records WHERE account_id = ?').bind(account.id),
      env.DB.prepare('DELETE FROM accounts WHERE id = ?').bind(account.id)
    ]);
    return json({ deleted:true, retainedForBilling:false });
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
  try { await ensureAccountSchema(env); await ensureConsultationSchema(env); await ensureMemberCenterSchema(env); await ensureCommerceSchema(env); } catch { return json({ error:'회원 데이터 저장소를 사용할 수 없습니다.' }, 503); }
  const key = await userKey(identity.email, env.ACCOUNT_HASH_SECRET);
  const account = await env.DB.prepare("SELECT a.id, a.role, a.created_at AS createdAt, COALESCE(ap.status,'active') status FROM accounts a LEFT JOIN account_admin_profiles ap ON ap.account_id=a.id WHERE a.user_key = ?").bind(key).first();
  if (!account) return json({ signedIn:true, account:null, identity });
  if (account.status !== 'active') return json({ error:account.status === 'suspended' ? '이용이 정지된 계정입니다. 관리자에게 문의해주세요.' : '탈퇴 처리된 계정입니다.' }, 403);
  if (request.method === 'GET') {
    const profile = await env.DB.prepare('SELECT display_name AS displayName, phone, organization, job_title AS jobTitle, updated_at AS updatedAt FROM member_profiles WHERE account_id = ?').bind(account.id).first();
    const preferences = await env.DB.prepare('SELECT email_notifications AS email, sms_notifications AS sms, service_notifications AS service, marketing_notifications AS marketing FROM member_preferences WHERE account_id = ?').bind(account.id).first();
    const activity = await env.DB.prepare('SELECT id, event_type AS eventType, title, detail, occurred_at AS occurredAt FROM member_activity WHERE account_id = ? ORDER BY occurred_at DESC LIMIT 100').bind(account.id).all();
    const consultations = await env.DB.prepare('SELECT id, request_type AS requestType, requester_name AS requesterName, specialty, payload_json AS payloadJson, status, admin_note AS adminNote, created_at AS createdAt, updated_at AS updatedAt FROM consultation_requests WHERE lower(email) = ? ORDER BY created_at DESC LIMIT 100').bind(identity.email).all();
    const orders = await env.DB.prepare('SELECT order_number AS orderNumber, product_type AS productType, product_name AS productName, supply_amount AS supplyAmount, tax_amount AS taxAmount, total_amount AS totalAmount, status, payment_method AS paymentMethod, customer_name AS customerName, metadata_json AS metadataJson, paid_at AS paidAt, created_at AS createdAt FROM payment_orders WHERE account_id = ? ORDER BY created_at DESC LIMIT 100').bind(account.id).all();
    // 의사 회원의 이력서 요약(완성도·공개범위)을 함께 내려 마이페이지 지표에 사용.
    let resume = null;
    if (account.role === 'doctor') {
      try { resume = await env.DB.prepare('SELECT id, title, completion, visibility, updated_at AS updatedAt FROM resumes WHERE account_id = ? ORDER BY updated_at DESC LIMIT 1').bind(account.id).first(); } catch { resume = null; }
    }
    // 병원 회원의 추천 후보: 내 이메일의 상담 → CRM 케이스 → 후보. 실명·연락처는 제외(익명 표시).
    let recommendedCandidates = [];
    if (account.role === 'hospital') {
      try {
        const rows = await env.DB.prepare(
          "SELECT s.candidate_public_id AS code, s.consent_status AS consentStatus, s.submission_status AS submissionStatus, c.specialty, c.position_title AS positionTitle, c.stage, s.updated_at AS updatedAt " +
          "FROM candidate_submissions s JOIN recruitment_cases c ON c.id = s.case_id JOIN consultation_requests cr ON cr.id = c.consultation_id " +
          "WHERE lower(cr.email) = ? ORDER BY s.updated_at DESC LIMIT 50"
        ).bind(identity.email.toLowerCase()).all();
        recommendedCandidates = rows.results || [];
      } catch { recommendedCandidates = []; }
    }
    const orderList = (orders.results || []).map(row => { const { metadataJson, ...rest } = row; const meta = parseJsonObject(metadataJson) || {}; return { ...rest, exposure: meta.exposure || null }; });
    return json({ signedIn:true, account:{ role:account.role, createdAt:account.createdAt }, identity, profile:profile || null, notifications:preferences ? { email:Boolean(preferences.email), sms:Boolean(preferences.sms), service:Boolean(preferences.service), marketing:Boolean(preferences.marketing) } : null, activity:activity.results || [], consultations:(consultations.results || []).map(row => { const { payloadJson, ...record } = row; return { ...record, payload:parseJsonObject(payloadJson) }; }), orders:orderList, resume:resume || null, recommendedCandidates });
  }
  if (request.method === 'POST') {
    if (!sameOrigin(request)) return json({ error:'허용되지 않은 요청입니다.' }, 403);
    let body; try { body = await request.json(); } catch { return json({ error:'입력 내용을 확인해주세요.' }, 400); }
    // 소비자 환불(청약철회) 요청: 회원(병원·의사 공용)이 본인 결제 건에 환불을 신청. 실제 승인·환불은 관리자.
    if (body.action === 'refund_request') {
      const orderNumber = String(body.orderNumber || '').trim().slice(0, 60);
      const reason = String(body.reason == null ? '' : body.reason).trim().slice(0, 500);
      if (!orderNumber) return json({ error:'환불할 결제 건을 확인해주세요.' }, 400);
      if (!reason) return json({ error:'환불 사유를 입력해주세요.' }, 400);
      // 반드시 본인 소유 주문만. account_id로 소유권 확인.
      const order = await env.DB.prepare("SELECT id, order_number AS orderNumber, total_amount AS totalAmount, status FROM payment_orders WHERE order_number=? AND account_id=?").bind(orderNumber, account.id).first();
      if (!order) return json({ error:'본인 결제 내역에서 환불할 건을 찾을 수 없습니다.' }, 404);
      if (!['paid','partially_refunded'].includes(order.status)) return json({ error:'이미 환불되었거나 환불할 수 없는 상태의 결제입니다.' }, 400);
      // 중복 요청 방지: 처리 대기 중인 환불 요청이 있으면 거절.
      const pending = await env.DB.prepare("SELECT COUNT(*) c FROM payment_refunds WHERE order_id=? AND status IN ('requested','processing')").bind(order.id).first();
      if (Number(pending?.c || 0) > 0) return json({ error:'이미 접수된 환불 요청이 처리 중입니다. 처리 결과를 기다려 주세요.' }, 409);
      const refundId = crypto.randomUUID();
      await env.DB.batch([
        // 소비자 요청은 금액 미확정(0) 상태로 접수, 관리자가 확정·처리. requested_by=회원 이메일.
        env.DB.prepare("INSERT INTO payment_refunds (id, order_id, amount, reason, status, requested_by) VALUES (?, ?, 0, ?, 'requested', ?)").bind(refundId, order.id, reason, identity.email),
        env.DB.prepare("INSERT INTO payment_events (id, order_id, actor_key, event_type, detail_json) VALUES (?, ?, ?, 'refund_requested_by_member', ?)").bind(crypto.randomUUID(), order.id, identity.email, JSON.stringify({ refundId, reason }).slice(0,4000)),
        env.DB.prepare("INSERT INTO member_activity (id, account_id, event_type, title, detail) VALUES (?, ?, 'refund_request', '환불(청약철회)을 요청했습니다.', ?)").bind(crypto.randomUUID(), account.id, ('주문 ' + order.orderNumber).slice(0,200))
      ]);
      return json({ requested:true, orderNumber:order.orderNumber });
    }
    // 병원 자기계정 공고 등록: 병원 회원이 채용공고를 올린다. 검수 대기(draft)로 저장, created_by=병원 이메일.
    // 관리자(아빠)가 콘솔에서 승인(published)해야 공개 목록에 노출된다. 기본 무료.
    if (body.action === 'job_create') {
      if (account.role !== 'hospital') return json({ error:'채용공고 등록은 병원 회원만 가능합니다.' }, 403);
      try { await ensureAdminConsoleSchema(env); } catch { return json({ error:'공고 저장소를 사용할 수 없습니다.' }, 503); }
      const s = (v, max = 200) => String(v == null ? '' : v).trim().slice(0, max);
      const contentType = body.staffType === 'medical' ? 'medical_job' : 'doctor_job';
      const title = s(body.title, 180);
      const hospital = s(body.hospital, 120) || (account.role === 'hospital' ? '' : '');
      if (!title) return json({ error:'공고 제목을 입력해주세요.' }, 400);
      const details = {
        primary: s(body.region), secondary: s(body.role), dept: s(body.dept), region: s(body.region),
        role: s(body.role), employmentType: s(body.employmentType), career: s(body.career),
        pay: s(body.pay), deadline: s(body.deadline), schedule: s(body.schedule),
        description: s(body.description, 3000), fromHospital: true,
      };
      const id = crypto.randomUUID();
      await env.DB.prepare('INSERT INTO admin_content_records (id, content_type, title, subtitle, status, visibility, payload_json, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(id, contentType, title, hospital, 'draft', 'public', JSON.stringify(details).slice(0,120000), identity.email, identity.email).run();
      try { await env.DB.prepare("INSERT INTO member_activity (id, account_id, event_type, title, detail) VALUES (?, ?, 'job_posted', '채용공고를 등록했습니다(검수 대기).', ?)").bind(crypto.randomUUID(), account.id, title.slice(0,200)).run(); } catch {}
      return json({ created:true, id, status:'draft', message:'공고가 접수되었습니다. 검수 후 게시됩니다.' }, 201);
    }
    return json({ error:'지원하지 않는 요청입니다.' }, 400);
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
// 이력서 저장/조회 API. 로그인한 일반(의사·의료인) 회원 본인 이력서만 다룬다.
async function resumeApi(request, env) {
  const identity = authenticatedUser(request);
  if (!identity) return json({ error:'이력서는 로그인 후 등록할 수 있습니다.' }, 401);
  if (!env.ACCOUNT_HASH_SECRET || String(env.ACCOUNT_HASH_SECRET).length < 32) return json({ error:'회원 보안 설정을 확인해주세요.' }, 503);
  try { await ensureAccountSchema(env); await ensureMemberCenterSchema(env); } catch { return json({ error:'이력서 저장소를 사용할 수 없습니다.' }, 503); }
  const key = await userKey(identity.email, env.ACCOUNT_HASH_SECRET);
  const account = await env.DB.prepare('SELECT id, role FROM accounts WHERE user_key = ?').bind(key).first();
  if (!account) return json({ signedIn:true, resume:null });
  if (account.role !== 'doctor') return json({ error:'이력서는 일반(의사·의료인) 회원만 등록할 수 있습니다.' }, 403);
  if (request.method === 'GET') {
    const row = await env.DB.prepare('SELECT id, title, profession, specialty, name, phone, email, desired_regions AS desiredRegions, completion, visibility, status, detail_json AS detailJson, created_at AS createdAt, updated_at AS updatedAt FROM resumes WHERE account_id = ? ORDER BY updated_at DESC LIMIT 1').bind(account.id).first();
    if (!row) return json({ signedIn:true, resume:null });
    const { detailJson, ...rest } = row;
    return json({ signedIn:true, resume:{ ...rest, detail:parseJsonObject(detailJson) } });
  }
  if (request.method === 'POST') {
    if (!sameOrigin(request)) return json({ error:'허용되지 않은 요청입니다.' }, 403);
    const length = Number(request.headers.get('content-length') || 0);
    if (length > 131072) return json({ error:'이력서 내용이 너무 큽니다.' }, 413);
    let body; try { body = await request.json(); } catch { return json({ error:'입력 내용을 확인해주세요.' }, 400); }
    const s = (value, max = 200) => String(value == null ? '' : value).trim().slice(0, max);
    const title = s(body.title); const name = s(body.name); const phone = s(body.phone, 40);
    if (!title || !name || !phone) return json({ error:'이력서 제목·성함·연락처는 필수입니다.' }, 400);
    const visibility = ['public','proposal','private'].includes(body.visibility) ? body.visibility : 'private';
    const completion = Math.max(0, Math.min(100, Number(body.completion) || 0));
    // 구조화 핵심 필드 외 나머지(경력·학력·소개 등)는 detail JSON으로 저장.
    const detail = body.detail && typeof body.detail === 'object' ? body.detail : {};
    const existing = await env.DB.prepare('SELECT id FROM resumes WHERE account_id = ? ORDER BY updated_at DESC LIMIT 1').bind(account.id).first();
    const id = existing?.id || ('RES-' + Date.now().toString(36).toUpperCase() + crypto.randomUUID().slice(0,4).toUpperCase());
    const fields = [id, account.id, title, s(body.profession), s(body.specialty), name, phone, s(body.email), s(body.desiredRegions), completion, visibility, 'draft-review', JSON.stringify(detail).slice(0, 120000)];
    if (existing) {
      await env.DB.prepare('UPDATE resumes SET title=?, profession=?, specialty=?, name=?, phone=?, email=?, desired_regions=?, completion=?, visibility=?, detail_json=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
        .bind(title, s(body.profession), s(body.specialty), name, phone, s(body.email), s(body.desiredRegions), completion, visibility, JSON.stringify(detail).slice(0,120000), id).run();
    } else {
      await env.DB.prepare('INSERT INTO resumes (id, account_id, title, profession, specialty, name, phone, email, desired_regions, completion, visibility, status, detail_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(...fields).run();
    }
    try { await env.DB.prepare('INSERT INTO member_activity (id, account_id, event_type, title, detail) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), account.id, 'resume_update', existing ? '이력서를 수정했습니다.' : '이력서를 등록했습니다.', title).run(); } catch {}
    return json({ saved:true, id, completion, visibility }, existing ? 200 : 201);
  }
  return json({ error:'지원하지 않는 요청입니다.' }, 405);
}
// 관심공고(찜) 저장/조회. 로그인 회원의 서버 저장. 비로그인은 클라이언트 localStorage 사용.
async function savedJobsApi(request, env) {
  const identity = authenticatedUser(request);
  if (!identity) return json({ signedIn:false, saved:[] }, 200);
  if (!env.ACCOUNT_HASH_SECRET || String(env.ACCOUNT_HASH_SECRET).length < 32) return json({ signedIn:false, saved:[] });
  try { await ensureAccountSchema(env); await ensureMemberCenterSchema(env); } catch { return json({ signedIn:false, saved:[] }); }
  const key = await userKey(identity.email, env.ACCOUNT_HASH_SECRET);
  const account = await env.DB.prepare('SELECT id FROM accounts WHERE user_key = ?').bind(key).first();
  if (!account) return json({ signedIn:true, saved:[] });
  const kind = new URL(request.url).searchParams.get('kind') === 'talent' ? 'talent' : 'job';
  if (request.method === 'GET') {
    const rows = await env.DB.prepare('SELECT job_id AS jobId FROM saved_jobs WHERE account_id = ? AND kind = ? ORDER BY created_at DESC').bind(account.id, kind).all();
    return json({ signedIn:true, saved:(rows.results || []).map(r => r.jobId) });
  }
  if (request.method === 'POST') {
    if (!sameOrigin(request)) return json({ error:'허용되지 않은 요청입니다.' }, 403);
    let body; try { body = await request.json(); } catch { return json({ error:'입력 내용을 확인해주세요.' }, 400); }
    const jobId = String(body.jobId || '').slice(0, 120);
    const k = body.kind === 'talent' ? 'talent' : 'job';
    if (!jobId) return json({ error:'대상이 없습니다.' }, 400);
    const existing = await env.DB.prepare('SELECT job_id FROM saved_jobs WHERE account_id = ? AND job_id = ? AND kind = ?').bind(account.id, jobId, k).first();
    if (existing) { await env.DB.prepare('DELETE FROM saved_jobs WHERE account_id = ? AND job_id = ? AND kind = ?').bind(account.id, jobId, k).run(); return json({ saved:false, jobId }); }
    await env.DB.prepare('INSERT INTO saved_jobs (account_id, job_id, kind) VALUES (?, ?, ?)').bind(account.id, jobId, k).run();
    return json({ saved:true, jobId });
  }
  return json({ error:'지원하지 않는 요청입니다.' }, 405);
}
// 인재 상세 열람: 병원이 열람권을 보유한 인재에게만 연락처·이력서 상세를 서버가 제공한다.
// (열람권 없으면 익명·기본정보만 → 결제 유도) 실명·연락처는 클라 마스킹이 아니라 서버가 조건부로만 내려준다.
async function talentDetailApi(request, env, pathname) {
  if (request.method !== 'GET') return json({ error:'지원하지 않는 요청입니다.' }, 405);
  const talentId = decodeURIComponent(pathname.slice('/api/talent-detail/'.length));
  if (!talentId) return json({ error:'대상이 없습니다.' }, 400);
  const identity = authenticatedUser(request);
  if (!identity || !env.ACCOUNT_HASH_SECRET) return json({ unlocked:false, detail:null });
  try { await ensureAccountSchema(env); await ensureMemberCenterSchema(env); } catch { return json({ unlocked:false, detail:null }); }
  const key = await userKey(identity.email, env.ACCOUNT_HASH_SECRET);
  const account = await env.DB.prepare('SELECT id, role FROM accounts WHERE user_key = ?').bind(key).first();
  const isAdmin = adminIdentity(request, env);
  // 병원·관리자만 열람 가능. 병원은 열람권(유효기간 내) 보유 시에만.
  if (!account && !isAdmin) return json({ unlocked:false, detail:null });
  let hasUnlock = Boolean(isAdmin);
  if (!hasUnlock && account?.role === 'hospital') {
    const now = new Date().toISOString();
    const row = await env.DB.prepare("SELECT id FROM talent_unlocks WHERE hospital_account_id = ? AND talent_id = ? AND (expires_at IS NULL OR expires_at > ?) LIMIT 1").bind(account.id, talentId, now).first();
    hasUnlock = Boolean(row);
  }
  if (!hasUnlock) return json({ unlocked:false, detail:null });
  // === 정보 유출 방어: 병원 계정의 열람 빈도를 검사한다(관리자는 예외). ===
  // 하루 상한(기본 30명)과 10분 폭주 임계(기본 15건)를 넘으면 차단하거나 경고를 남긴다.
  const DAILY_LIMIT = Number(env.TALENT_VIEW_DAILY_LIMIT || 30);
  const BURST_WINDOW_MIN = 10;
  const BURST_LIMIT = Number(env.TALENT_VIEW_BURST_LIMIT || 15);
  let dailyCount = 0;
  if (!isAdmin && account) {
    try {
      const dayAgo = new Date(Date.now() - 86400000).toISOString();
      const burstAgo = new Date(Date.now() - BURST_WINDOW_MIN * 60000).toISOString();
      // 오늘 이 병원이 조회한 서로 다른 후보 수(같은 후보 반복은 1로 계산).
      const dailyRow = await env.DB.prepare("SELECT COUNT(DISTINCT subject_ref) AS n FROM access_audit_logs WHERE actor_key = ? AND action = 'talent_unlock_view' AND created_at >= ?").bind(identity.email, dayAgo).first();
      dailyCount = Number(dailyRow?.n || 0);
      const burstRow = await env.DB.prepare("SELECT COUNT(*) AS n FROM access_audit_logs WHERE actor_key = ? AND action = 'talent_unlock_view' AND created_at >= ?").bind(identity.email, burstAgo).first();
      const burstCount = Number(burstRow?.n || 0);
      // 하루 상한 초과: 차단하고 경고 로그.
      const alreadySeen = await env.DB.prepare("SELECT 1 FROM access_audit_logs WHERE actor_key = ? AND action = 'talent_unlock_view' AND subject_ref = ? LIMIT 1").bind(identity.email, talentId).first();
      if (!alreadySeen && dailyCount >= DAILY_LIMIT) {
        try { await env.DB.prepare("INSERT INTO access_audit_logs (id, actor_key, action, subject_ref, metadata_json) VALUES (?, ?, 'talent_unlock_blocked', ?, ?)").bind(crypto.randomUUID(), identity.email, talentId, JSON.stringify({ reason:'daily_limit', dailyCount, limit:DAILY_LIMIT })).run(); } catch {}
        return json({ unlocked:true, detail:null, limited:true, message:'금일 열람 한도를 초과했습니다. 대량 정보 수집 방지를 위해 잠시 후 다시 이용해 주세요.' }, 429);
      }
      // 단시간 폭주: 차단하진 않되 경고 로그를 남겨 관리자가 탐지.
      if (burstCount + 1 >= BURST_LIMIT) {
        try { await env.DB.prepare("INSERT INTO access_audit_logs (id, actor_key, action, subject_ref, metadata_json) VALUES (?, ?, 'talent_unlock_burst', ?, ?)").bind(crypto.randomUUID(), identity.email, talentId, JSON.stringify({ burstCount:burstCount + 1, windowMin:BURST_WINDOW_MIN })).run(); } catch {}
      }
    } catch {}
  }
  // 열람권 보유 → 이력서 상세 제공. talentId가 resume-<id> 형태면 resumes에서 조회.
  const resumeId = talentId.startsWith('resume-') ? talentId.slice('resume-'.length) : '';
  if (resumeId) {
    const r = await env.DB.prepare('SELECT id, name, phone, email, profession, specialty, desired_regions AS desiredRegions, detail_json AS detailJson FROM resumes WHERE id = ?').bind(resumeId).first();
    if (r) {
      try { await env.DB.prepare("INSERT INTO access_audit_logs (id, actor_key, subject_ref, action) VALUES (?, ?, ?, 'talent_unlock_view')").bind(crypto.randomUUID(), identity.email, talentId).run(); } catch {}
      const { detailJson, ...rest } = r;
      return json({ unlocked:true, detail:{ ...rest, detail:parseJsonObject(detailJson) } });
    }
  }
  // 실제 이력서가 없더라도(정적 샘플 등) 열람 사실은 기록해 빈도 집계에 반영.
  try { await env.DB.prepare("INSERT INTO access_audit_logs (id, actor_key, subject_ref, action) VALUES (?, ?, ?, 'talent_unlock_view')").bind(crypto.randomUUID(), identity.email, talentId).run(); } catch {}
  return json({ unlocked:true, detail:null });
}
const paymentProductCatalog = {
  basic:{ type:'doctor_ad', name:'베이직 공고', amount:59000, exposureDays:30 },
  featured:{ type:'doctor_ad', name:'추천 공고', amount:149000, exposureDays:30 },
  intensive:{ type:'doctor_ad', name:'집중 채용', amount:299000, exposureDays:45 },
  'doctor-single':{ type:'membership', name:'커리어 체크', amount:19000 },
  'doctor-pass':{ type:'membership', name:'커리어 컨시어지', amount:39000, exposureDays:30 },
  // 병원용 인재 이력서 열람권. 결제 시 talent_unlocks에 권한 기록 → 연락처·상세 공개.
  'talent-unlock-single':{ type:'talent_search', name:'인재 열람권 (1명)', amount:5000, unlockDays:30 },
  'talent-unlock-pack':{ type:'talent_search', name:'인재 열람권 (5명 팩)', amount:20000, unlockDays:30, unlockCount:5 }
};
function cleanOrderValue(value, max = 180) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function createOrderNumber() {
  const date = new Date().toISOString().slice(0,10).replaceAll('-','');
  return 'MH-' + date + '-' + crypto.randomUUID().replaceAll('-','').slice(0,8).toUpperCase();
}
async function paymentOrderApi(request, env) {
  const identity = authenticatedUser(request);
  if (!identity) return json({ error:'로그인한 회원만 결제를 신청할 수 있습니다.' }, 401);
  if (!env.ACCOUNT_HASH_SECRET || String(env.ACCOUNT_HASH_SECRET).length < 32) return json({ error:'회원 보안 설정을 확인해주세요.' }, 503);
  try { await ensureAccountSchema(env); await ensureCommerceSchema(env); } catch { return json({ error:'결제 데이터 저장소를 사용할 수 없습니다.' }, 503); }
  const key = await userKey(identity.email, env.ACCOUNT_HASH_SECRET);
  const account = await env.DB.prepare("SELECT a.id, a.role, COALESCE(ap.status,'active') status FROM accounts a LEFT JOIN account_admin_profiles ap ON ap.account_id=a.id WHERE a.user_key = ?").bind(key).first();
  if (!account) return json({ error:'회원가입을 완료한 뒤 이용해주세요.' }, 403);
  if (account.status !== 'active') return json({ error:'이용할 수 없는 회원 계정입니다.' }, 403);
  if (request.method === 'GET') {
    const result = await env.DB.prepare('SELECT order_number AS orderNumber, product_type AS productType, product_name AS productName, total_amount AS totalAmount, status, payment_method AS paymentMethod, paid_at AS paidAt, created_at AS createdAt FROM payment_orders WHERE account_id = ? ORDER BY created_at DESC LIMIT 100').bind(account.id).all();
    return json({ orders:result.results || [] });
  }
  if (request.method !== 'POST') return json({ error:'지원하지 않는 요청입니다.' }, 405);
  if (!sameOrigin(request)) return json({ error:'허용되지 않은 요청입니다.' }, 403);
  let body; try { body = await request.json(); } catch { return json({ error:'주문 내용을 확인해주세요.' }, 400); }
  const product = paymentProductCatalog[String(body.productId || '')];
  if (!product) return json({ error:'신청 상품을 확인해주세요.' }, 400);
  if (product.type === 'doctor_ad' && account.role !== 'hospital') return json({ error:'병원 회원만 공고 상품을 신청할 수 있습니다.' }, 403);
  if (product.type === 'membership' && account.role !== 'doctor') return json({ error:'의사 회원만 커리어 상품을 신청할 수 있습니다.' }, 403);
  const totalAmount = product.amount;
  const supplyAmount = Math.round(totalAmount / 1.1);
  const taxAmount = totalAmount - supplyAmount;
  const id = crypto.randomUUID();
  const orderNumber = createOrderNumber();
  const customerName = cleanOrderValue(body.customerName);
  const customerEmail = cleanOrderValue(body.customerEmail || identity.email);
  const customerPhone = cleanOrderValue(body.customerPhone);
  const paymentMethod = ['card','transfer'].includes(body.paymentMethod) ? body.paymentMethod : 'card';
  const metadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : {};
  const metadataJson = JSON.stringify(metadata).slice(0,12000);
  await env.DB.batch([
    env.DB.prepare("INSERT INTO payment_orders (id, order_number, account_id, product_type, product_id, product_name, supply_amount, tax_amount, total_amount, payment_method, customer_name, customer_email, customer_phone, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, orderNumber, account.id, product.type, String(body.productId), product.name, supplyAmount, taxAmount, totalAmount, paymentMethod, customerName, customerEmail, customerPhone, metadataJson),
    env.DB.prepare("INSERT INTO payment_events (id, order_id, actor_key, event_type, to_status, detail_json) VALUES (?, ?, ?, 'order_created', 'pending_review', ?)").bind(crypto.randomUUID(), id, identity.email, JSON.stringify({ productId:body.productId, paymentMethod }))
  ]);
  // 이니시스 웹표준결제 파라미터(키 설정 시). 결제창은 이 값으로 호출한다.
  const inicis = await buildInicisPaymentParams(env, { orderNumber, amount:totalAmount, productName:product.name, buyerName:customerName || identity.email, buyerEmail:customerEmail, buyerTel:customerPhone });
  return json({ order:{ id, orderNumber, productName:product.name, totalAmount, status:'pending_review' }, inicis }, 201);
}
async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2,'0')).join('');
}
// 이니시스 웹표준결제 요청 파라미터·서명 생성. MID/signKey 미설정 시 configured:false.
async function buildInicisPaymentParams(env, order) {
  if (!env.INICIS_MID || !env.INICIS_SIGN_KEY) return { configured:false };
  const mid = env.INICIS_MID;
  const timestamp = String(Date.now());
  const amount = String(order.amount);
  const oid = order.orderNumber;
  // 이니시스 규격: signature=SHA256(oid=..&price=..&timestamp=..), mKey=SHA256(signKey)
  const signature = await sha256Hex('oid=' + oid + '&price=' + amount + '&timestamp=' + timestamp);
  const mKey = await sha256Hex(env.INICIS_SIGN_KEY);
  return {
    configured:true, mid, oid, price:amount, timestamp, signature, mKey,
    goodname:order.productName, buyername:order.buyerName, buyeremail:order.buyerEmail || '', buyertel:order.buyerTel || '',
    returnUrl:(env.SITE_ORIGIN || '') + '/api/payment-approve', closeUrl:(env.SITE_ORIGIN || '') + '/',
    gopaymethod:'Card', currency:'WON', version:'1.0', mobile:false
  };
}
// 이니시스 결제창 리턴 → 서버가 최종 승인요청·금액검증 후 주문을 paid 처리한다.
// INICIS 키 미설정 시: 결제 흐름을 시뮬레이션하는 테스트(가상) 모드로 동작한다.
// (DB 저장·paid 처리·거래기록은 실제로 작동. 실제 카드 청구만 없음.)
async function paymentApproveApi(request, env) {
  if (request.method !== 'POST') return json({ error:'지원하지 않는 요청입니다.' }, 405);
  const inicisReady = Boolean(env.INICIS_MID && env.INICIS_SIGN_KEY);
  // 안전장치: 실결제 의도(PAYMENT_LIVE=true)인데 키가 불완전하면 '무료 승인'을 막고 명시적으로 실패시킨다.
  // (프로덕션에서 키 누락/오타로 전 주문이 무료 통과되는 사고 방지)
  if (env.PAYMENT_LIVE === 'true' && !inicisReady) {
    return json({ error:'결제 설정이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요.', code:'PG_NOT_CONFIGURED' }, 503);
  }
  const testMode = !inicisReady;
  if (!sameOrigin(request)) return json({ error:'허용되지 않은 요청입니다.' }, 403);
  try { await ensureCommerceSchema(env); } catch { return json({ error:'결제 저장소를 사용할 수 없습니다.' }, 503); }
  let body; try { body = await request.json(); } catch {
    // 이니시스는 form-urlencoded로 리턴하므로 폼도 파싱.
    try { const form = await request.formData(); body = Object.fromEntries(form.entries()); } catch { return json({ error:'결제 결과를 확인할 수 없습니다.' }, 400); }
  }
  const resultCode = String(body.resultCode || body.P_STATUS || '');
  const authToken = String(body.authToken || '');
  const authUrl = String(body.authUrl || '');
  const oid = String(body.orderNumber || body.oid || body.P_OID || '');
  if (!oid) return json({ error:'주문번호가 없습니다.' }, 400);
  const order = await env.DB.prepare('SELECT id, account_id AS accountId, total_amount AS totalAmount, status, product_id AS productId, product_type AS productType, metadata_json AS metadataJson FROM payment_orders WHERE order_number = ?').bind(oid).first();
  if (!order) return json({ error:'주문을 찾을 수 없습니다.' }, 404);
  // 결제 완료 시 광고 상품이면 노출기간(시작~종료)을 metadata에 기록해 마이페이지·관리자에서 표시.
  const buildExposureMeta = (base) => {
    const product = paymentProductCatalog[String(order.productId || '')];
    const meta = { ...(parseJsonObject(base) || {}) };
    if (product?.exposureDays) {
      const start = new Date();
      const end = new Date(start.getTime() + product.exposureDays * 86400000);
      meta.exposure = { start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10), days: product.exposureDays };
    }
    return JSON.stringify(meta).slice(0, 12000);
  };
  // 인재 열람권 상품이면 결제 병원에 열람 권한을 기록한다(주문 metadata의 talentId 대상).
  const recordTalentUnlock = async () => {
    const product = paymentProductCatalog[String(order.productId || '')];
    if (product?.type !== 'talent_search') return;
    const meta = parseJsonObject(order.metadataJson) || {};
    const talentId = String(meta.talentId || '');
    if (!talentId) return;
    try { await ensureMemberCenterSchema(env); } catch { return; }
    const expires = product.unlockDays ? new Date(Date.now() + product.unlockDays * 86400000).toISOString() : null;
    try {
      await env.DB.prepare("INSERT INTO talent_unlocks (id, hospital_account_id, talent_id, order_id, expires_at) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), order.accountId, talentId, order.id, expires).run();
    } catch {}
  };
  // === 테스트(가상) 결제 모드: 실제 이니시스 없이 승인 성공 처리 ===
  if (testMode) {
    const tid = 'TEST-' + Date.now().toString(36).toUpperCase();
    await env.DB.batch([
      env.DB.prepare("UPDATE payment_orders SET status='paid', payment_method='card', paid_at=CURRENT_TIMESTAMP, metadata_json=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(buildExposureMeta(order.metadataJson), order.id),
      env.DB.prepare("INSERT INTO payment_transactions (id, order_id, transaction_type, provider, provider_transaction_id, amount, status, processed_at) VALUES (?, ?, 'capture', 'test', ?, ?, 'succeeded', CURRENT_TIMESTAMP)").bind(crypto.randomUUID(), order.id, tid, Number(order.totalAmount)),
      env.DB.prepare("INSERT INTO payment_events (id, order_id, actor_key, event_type, to_status, detail_json) VALUES (?, ?, 'test', 'payment_approved', 'paid', ?)").bind(crypto.randomUUID(), order.id, JSON.stringify({ tid, oid, testMode:true }))
    ]);
    await recordTalentUnlock();
    return json({ approved:true, status:'paid', orderNumber:oid, tid, testMode:true, message:'테스트 결제가 완료되었습니다(실제 청구 없음).' });
  }
  // 결제창 인증 실패
  if (resultCode && resultCode !== '0000') {
    await env.DB.prepare("UPDATE payment_orders SET status='failed', updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(order.id).run();
    return json({ approved:false, status:'failed', message:String(body.resultMsg || '결제가 취소되었거나 실패했습니다.') });
  }
  // 실제 승인요청: authUrl로 authToken을 전송해 최종 승인. 승인 금액이 주문 금액과 다르면 거절.
  let approval = null;
  if (authToken && authUrl) {
    const timestamp = String(Date.now());
    const signature = await sha256Hex('authToken=' + authToken + '&timestamp=' + timestamp);
    const verification = await sha256Hex('authToken=' + authToken + '&signKey=' + env.INICIS_SIGN_KEY + '&timestamp=' + timestamp);
    try {
      const res = await fetch(authUrl, { method:'POST', headers:{ 'content-type':'application/x-www-form-urlencoded' },
        body:new URLSearchParams({ mid:env.INICIS_MID, authToken, timestamp, signature, verification, charset:'UTF-8', format:'JSON' }) });
      approval = await res.json();
    } catch { return json({ error:'승인 서버 통신에 실패했습니다.' }, 502); }
    const approvedAmount = Number(approval?.TotPrice || approval?.price || 0);
    if (String(approval?.resultCode) !== '0000') {
      await env.DB.prepare("UPDATE payment_orders SET status='failed', updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(order.id).run();
      return json({ approved:false, status:'failed', message:String(approval?.resultMsg || '승인 실패') });
    }
    if (approvedAmount !== Number(order.totalAmount)) {
      // 금액 위변조 방지: 승인금액≠주문금액이면 실패 처리.
      await env.DB.prepare("UPDATE payment_orders SET status='failed', updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(order.id).run();
      return json({ approved:false, status:'failed', message:'결제 금액이 일치하지 않습니다.' }, 400);
    }
  }
  const tid = String(approval?.tid || body.tid || '');
  await env.DB.batch([
    env.DB.prepare("UPDATE payment_orders SET status='paid', payment_method='card', paid_at=CURRENT_TIMESTAMP, metadata_json=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(buildExposureMeta(order.metadataJson), order.id),
    env.DB.prepare("INSERT INTO payment_transactions (id, order_id, transaction_type, provider, provider_transaction_id, amount, status, processed_at) VALUES (?, ?, 'capture', 'inicis', ?, ?, 'succeeded', CURRENT_TIMESTAMP)").bind(crypto.randomUUID(), order.id, tid, Number(order.totalAmount)),
    env.DB.prepare("INSERT INTO payment_events (id, order_id, actor_key, event_type, to_status, detail_json) VALUES (?, ?, 'inicis', 'payment_approved', 'paid', ?)").bind(crypto.randomUUID(), order.id, JSON.stringify({ tid, oid }))
  ]);
  await recordTalentUnlock();
  return json({ approved:true, status:'paid', orderNumber:oid, tid });
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
// 관리자용: 인재 이력서 열람 감사. 병원별 열람량과 차단·폭주 경고를 확인해 정보 빼가기를 탐지.
async function talentAccessAuditApi(request, env) {
  if (request.method !== 'GET') return json({ error:'지원하지 않는 요청입니다.' }, 405);
  const admin = adminIdentity(request, env);
  if (!admin) return json({ error:'관리자 권한이 필요합니다.' }, 401);
  try { await ensureRecruitmentCrmSchema(env); } catch { return json({ admin, viewers:[], alerts:[], recent:[] }); }
  const dayAgo = new Date(Date.now() - 86400000).toISOString();
  // 병원(actor)별 최근 24시간 열람 통계.
  const viewers = await env.DB.prepare("SELECT actor_key AS viewer, COUNT(DISTINCT subject_ref) AS candidates, COUNT(*) AS views, MAX(created_at) AS lastAt FROM access_audit_logs WHERE action = 'talent_unlock_view' AND created_at >= ? GROUP BY actor_key ORDER BY candidates DESC LIMIT 100").bind(dayAgo).all();
  // 차단·폭주 경고(최근 7일).
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const alerts = await env.DB.prepare("SELECT actor_key AS viewer, action, subject_ref AS subject, metadata_json AS metaJson, created_at AS at FROM access_audit_logs WHERE action IN ('talent_unlock_blocked','talent_unlock_burst') AND created_at >= ? ORDER BY created_at DESC LIMIT 100").bind(weekAgo).all();
  const recent = await env.DB.prepare("SELECT actor_key AS viewer, subject_ref AS subject, created_at AS at FROM access_audit_logs WHERE action = 'talent_unlock_view' ORDER BY created_at DESC LIMIT 50").all();
  return json({
    admin,
    viewers: viewers.results || [],
    alerts: (alerts.results || []).map(a => { const { metaJson, ...rest } = a; return { ...rest, meta: parseJsonObject(metaJson) }; }),
    recent: recent.results || []
  });
}
const adminSettingKeys = ['siteName','supportPhone','supportEmail','announcement','maintenanceMode'];
const adminFeatureKeys = ['doctorRecruitment','talentSearch','resumeRegistration','medicalStaffHub','paidCareerService','adRegistration'];
const adminCategoryGroups = ['doctor_specialty','region','medical_role'];
async function writeAdminAudit(env, admin, action, subject, payload) {
  await env.DB.prepare('INSERT INTO admin_audit_logs (id, actor_email, action, subject, payload_json) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), admin.email, action, subject || '', JSON.stringify(payload || {})).run();
}
async function seedAdminConsole(env) {
  const categories = [
    ['doctor_specialty','내과','internal-medicine',10], ['doctor_specialty','외과','general-surgery',20],
    ['doctor_specialty','정형외과','orthopedics',30], ['doctor_specialty','신경외과','neurosurgery',40],
    ['doctor_specialty','소아청소년과','pediatrics',50], ['doctor_specialty','산부인과','obstetrics-gynecology',60],
    ['doctor_specialty','가정의학과','family-medicine',70], ['doctor_specialty','영상의학과','radiology',80],
    ['doctor_specialty','마취통증의학과','anesthesiology',90], ['doctor_specialty','정신건강의학과','psychiatry',100],
    ['doctor_specialty','피부과','dermatology',110], ['doctor_specialty','성형외과','plastic-surgery',120],
    ['doctor_specialty','안과','ophthalmology',130], ['doctor_specialty','이비인후과','otolaryngology',140],
    ['doctor_specialty','비뇨의학과','urology',150], ['doctor_specialty','재활의학과','rehabilitation-medicine',160],
    ['doctor_specialty','응급의학과','emergency-medicine',170], ['doctor_specialty','신경과','neurology',180],
    ['doctor_specialty','진단검사의학과','laboratory-medicine',190], ['doctor_specialty','병리과','pathology',200],
    ['doctor_specialty','심장혈관흉부외과','cardiothoracic-surgery',210], ['doctor_specialty','직업환경의학과','occupational-medicine',220],
    ['doctor_specialty','핵의학과','nuclear-medicine',230], ['doctor_specialty','예방의학과','preventive-medicine',240],
    ['region','서울','seoul',10], ['region','경기','gyeonggi',20], ['region','인천','incheon',30],
    ['region','부산','busan',40], ['region','대구','daegu',50], ['region','대전','daejeon',60],
    ['region','광주','gwangju',70], ['region','울산','ulsan',80], ['region','세종','sejong',90],
    ['region','강원','gangwon',100], ['region','충북','chungbuk',110], ['region','충남','chungnam',120],
    ['region','전북','jeonbuk',130], ['region','전남','jeonnam',140], ['region','경북','gyeongbuk',150],
    ['region','경남','gyeongnam',160], ['region','제주','jeju',170],
    ['medical_role','간호사','nurse',10], ['medical_role','간호조무사','nursing-assistant',20],
    ['medical_role','방사선사','radiologic-technologist',30], ['medical_role','임상병리사','clinical-laboratory-technologist',40],
    ['medical_role','물리치료사','physical-therapist',50], ['medical_role','작업치료사','occupational-therapist',60],
    ['medical_role','치과위생사','dental-hygienist',70], ['medical_role','약사','pharmacist',80],
    ['medical_role','응급구조사','emergency-medical-technician',90], ['medical_role','보건의료정보관리사','health-information-manager',100],
    ['medical_role','안경사','optician',110], ['medical_role','병원행정','hospital-administration',120]
  ];
  const settings = {
    siteName:'메디헬퍼스', supportPhone:'051-342-5463', supportEmail:'hr@medihelpers.co.kr',
    announcement:'의사 채용·이직 전문 헤드헌팅', maintenanceMode:'false'
  };
  const features = {
    doctorRecruitment:[1,'의사 채용공고 목록과 상세 페이지'], talentSearch:[1,'병원 회원의 익명 인재 검색'],
    resumeRegistration:[1,'의사 회원 이력서 작성 및 관리'], medicalStaffHub:[1,'간호·보건 직군 채용정보'],
    paidCareerService:[0,'유료 조건 비교·계약 분석'], adRegistration:[1,'공고 상품 신청과 검수']
  };
  const medicalStaffRestored = await env.DB.prepare("SELECT setting_value FROM site_settings WHERE setting_key='migration_medical_staff_hub_v1'").first();
  const statements = categories.map(([group,name,slug,sort]) => env.DB.prepare('INSERT OR IGNORE INTO admin_categories (id, group_key, name, slug, sort_order) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), group, name, slug, sort));
  Object.entries(settings).forEach(([key,value]) => statements.push(env.DB.prepare('INSERT OR IGNORE INTO site_settings (setting_key, setting_value) VALUES (?, ?)').bind(key, value)));
  Object.entries(features).forEach(([key,[enabled,description]]) => statements.push(env.DB.prepare('INSERT OR IGNORE INTO feature_flags (flag_key, enabled, description) VALUES (?, ?, ?)').bind(key, enabled, description)));
  if (!medicalStaffRestored) {
    statements.push(env.DB.prepare("UPDATE feature_flags SET enabled=1, description='간호·보건 직군 채용정보' WHERE flag_key='medicalStaffHub'"));
    statements.push(env.DB.prepare("INSERT INTO site_settings (setting_key, setting_value) VALUES ('migration_medical_staff_hub_v1','completed')"));
  }
  await env.DB.batch(statements);
}
async function publicCategoriesApi(request, env) {
  if (request.method !== 'GET') return json({ error:'지원하지 않는 요청입니다.' }, 405);
  await ensureAdminConsoleSchema(env);
  await seedAdminConsole(env);
  const result = await env.DB.prepare('SELECT group_key AS groupKey, name, slug, sort_order AS sortOrder FROM admin_categories WHERE enabled = 1 ORDER BY group_key, sort_order, name').all();
  const groups = { doctor_specialty:[], region:[], medical_role:[] };
  for (const row of result.results || []) if (groups[row.groupKey]) groups[row.groupKey].push({ name:row.name, slug:row.slug, sortOrder:row.sortOrder });
  return json({ categories:groups }, 200, { 'cache-control':'public, max-age=60' });
}
async function publicSiteOperationsApi(request, env) {
  if (request.method !== 'GET') return json({ error:'지원하지 않는 요청입니다.' }, 405);
  await ensureAdminConsoleSchema(env);
  await seedAdminConsole(env);
  const allowedVisibility = new Set(['public']);
  const identity = authenticatedUser(request);
  if (adminIdentity(request, env)) ['doctor','hospital','admin'].forEach(value => allowedVisibility.add(value));
  else if (identity && env.ACCOUNT_HASH_SECRET) {
    try {
      await ensureAccountSchema(env);
      const key = await userKey(identity.email, env.ACCOUNT_HASH_SECRET);
      const account = await env.DB.prepare('SELECT role FROM accounts WHERE user_key=?').bind(key).first();
      if (account?.role) allowedVisibility.add(account.role);
    } catch {}
  }
  const [settingsResult, featuresResult, contentResult] = await Promise.all([
    env.DB.prepare('SELECT setting_key AS settingKey, setting_value AS settingValue FROM site_settings').all(),
    env.DB.prepare('SELECT flag_key AS flagKey, enabled FROM feature_flags').all(),
    env.DB.prepare("SELECT id, content_type AS contentType, title, subtitle, visibility, payload_json AS payloadJson, sort_order AS sortOrder, published_at AS publishedAt, updated_at AS updatedAt FROM admin_content_records WHERE status='published' ORDER BY sort_order DESC, published_at DESC, updated_at DESC LIMIT 500").all()
  ]);
  const settings = Object.fromEntries((settingsResult.results || []).map(row => [row.settingKey, row.settingValue]));
  const features = Object.fromEntries((featuresResult.results || []).map(row => [row.flagKey, Boolean(row.enabled)]));
  // 급여·상세 열람 권한: 의사 회원(role=doctor)·병원·관리자는 열람. 비로그인은 제한.
  const canViewSensitive = allowedVisibility.has('doctor') || allowedVisibility.has('hospital') || allowedVisibility.has('admin');
  // 유출방어: 비인증자에게는 공고 payload의 급여·상세근무·병원 식별정보를 서버에서 제거한다.
  // 단 병원이 비용을 낸 광고 공고(adTier)는 널리 알리는 것이 목적이므로 급여를 공개한다.
  const sensitiveFields = ['pay','workHours','daysOff','fullAddress','businessNumber','representative','doctorCount','dailyVolume','staffCount','equipment','beds','website'];
  const stripSensitive = (contentType, payload) => {
    if (canViewSensitive) return payload;
    if (contentType !== 'doctor_job' && contentType !== 'medical_job') return payload;
    const isAd = Boolean(payload.adTier);
    const isPrivate = payload.badge === '비공개';
    if (isAd && !isPrivate) return payload; // 유료 광고 공고는 공개
    const filtered = { ...payload, locked: true };
    for (const field of sensitiveFields) if (field in filtered) delete filtered[field];
    return filtered;
  };
  const contents = (contentResult.results || []).filter(row => allowedVisibility.has(row.visibility)).map(row => { let payload = {}; try { payload = JSON.parse(row.payloadJson || '{}'); } catch {} const { payloadJson, ...record } = row; return { ...record, payload:stripSensitive(row.contentType, payload) }; });
  // 구직 등록 = 이력서 등록 시 의사가 '인재정보에 구직 공개(visibility=public)'를 직접 선택한 경우에만
  // 인재정보에 익명으로 노출한다(본인 선택, 자동 아님). 실명·연락처·이메일은 절대 미포함.
  // 연락처·이력서 상세는 병원의 열람권 결제 후 별도 API로만 제공한다.
  try {
    const resumeRows = await env.DB.prepare("SELECT id, profession, specialty, desired_regions AS desiredRegions, detail_json AS detailJson, updated_at AS updatedAt FROM resumes WHERE visibility='public' ORDER BY updated_at DESC LIMIT 200").all();
    for (const r of (resumeRows.results || [])) {
      const detail = parseJsonObject(r.detailJson) || {};
      const career = detail.experienceYears ? String(detail.experienceYears) : (detail.career || '');
      // 직군으로 의사/의료인 구분: 의사는 인재정보(/talent), 의료인은 의료인 채용 페이지에 노출.
      const isDoctor = /의사|전문의|의사직/.test(String(r.profession || ''));
      contents.push({
        id: 'resume-' + r.id, contentType: 'talent_profile', title: '', subtitle: '', visibility: 'public', updatedAt: r.updatedAt,
        payload: {
          code: 'MH-' + String(r.id).slice(-6).toUpperCase(), name: '',
          profession: r.profession || '', staffType: isDoctor ? 'doctor' : 'medical',
          dept: r.specialty || r.profession || '',
          career: career ? (career.includes('년') ? career : career + '년') : '경력 확인 필요',
          region: r.desiredRegions || '',
          preference: detail.workTypes ? (Array.isArray(detail.workTypes) ? detail.workTypes.join('·') : String(detail.workTypes)) : '',
          available: detail.available || '협의', identityConsent: false, fromResume: true,
        },
      });
    }
  } catch {}
  return json({ settings, features, contents });
}
async function adminConsoleApi(request, env) {
  const admin = adminIdentity(request, env);
  if (!admin) return json({ error:'관리자 권한이 필요합니다.' }, 403);
  try {
    await ensureAccountSchema(env);
    await ensureConsultationSchema(env);
    await ensureRecruitmentCrmSchema(env);
    await ensureAdminConsoleSchema(env);
    await ensureMemberCenterSchema(env);
    await ensureCommerceSchema(env);
    await seedAdminConsole(env);
  } catch {
    return json({ error:'관리자 데이터 저장소를 사용할 수 없습니다.' }, 503);
  }
  if (request.method === 'GET') {
    const [accounts, consultations, cases, categories, contentCount, auditCount, paymentMetrics, settingsResult, featuresResult, categoryResult, contentResult, memberResult, paymentResult, transactionResult, refundResult, auditResult, consultationResult, caseResult, resumeResult] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) total, SUM(CASE WHEN role='doctor' THEN 1 ELSE 0 END) doctors, SUM(CASE WHEN role='hospital' THEN 1 ELSE 0 END) hospitals FROM accounts").first(),
      env.DB.prepare('SELECT COUNT(*) total FROM consultation_requests').first(),
      env.DB.prepare("SELECT SUM(CASE WHEN stage NOT IN ('hired','closed') THEN 1 ELSE 0 END) active, SUM(CASE WHEN stage='hired' THEN 1 ELSE 0 END) hired FROM recruitment_cases").first(),
      env.DB.prepare('SELECT COUNT(*) total FROM admin_categories').first(),
      env.DB.prepare('SELECT COUNT(*) total FROM admin_content_records').first(),
      env.DB.prepare('SELECT COUNT(*) total FROM admin_audit_logs').first(),
      env.DB.prepare("SELECT COUNT(*) total, SUM(CASE WHEN status IN ('pending_review','awaiting_payment') THEN 1 ELSE 0 END) pending, SUM(CASE WHEN status='paid' THEN total_amount ELSE 0 END) paid_revenue, SUM(CASE WHEN status IN ('partially_refunded','refunded') THEN 1 ELSE 0 END) refunded FROM payment_orders").first(),
      env.DB.prepare('SELECT setting_key AS settingKey, setting_value AS settingValue FROM site_settings').all(),
      env.DB.prepare('SELECT flag_key AS flagKey, enabled FROM feature_flags').all(),
      env.DB.prepare('SELECT id, group_key AS groupKey, name, slug, sort_order AS sortOrder, enabled FROM admin_categories ORDER BY group_key, sort_order, name').all(),
      env.DB.prepare('SELECT id, content_type AS contentType, title, subtitle, status, visibility, payload_json AS payloadJson, sort_order AS sortOrder, created_by AS createdBy, updated_by AS updatedBy, published_at AS publishedAt, created_at AS createdAt, updated_at AS updatedAt FROM admin_content_records ORDER BY sort_order DESC, updated_at DESC LIMIT 500').all(),
      env.DB.prepare("SELECT a.id, a.role, a.created_at AS createdAt, a.updated_at AS updatedAt, COALESCE(ap.email,'') email, COALESCE(ap.full_name,'') fullName, COALESCE(ap.status,'active') status, COALESCE(ap.verification_status,'unverified') verificationStatus, ap.last_login_at AS lastLoginAt, COALESCE(mp.phone,'') phone, COALESCE(mp.organization,'') organization, COALESCE(mp.job_title,'') jobTitle, (SELECT COUNT(*) FROM consent_records cr WHERE cr.account_id=a.id) consentCount, (SELECT COUNT(*) FROM payment_orders po WHERE po.account_id=a.id) orderCount, COALESCE((SELECT SUM(po.total_amount) FROM payment_orders po WHERE po.account_id=a.id AND po.status='paid'),0) lifetimeValue FROM accounts a LEFT JOIN account_admin_profiles ap ON ap.account_id=a.id LEFT JOIN member_profiles mp ON mp.account_id=a.id ORDER BY a.created_at DESC LIMIT 500").all(),
      env.DB.prepare("SELECT po.id, po.order_number AS orderNumber, po.account_id AS accountId, po.product_type AS productType, po.product_id AS productId, po.product_name AS productName, po.supply_amount AS supplyAmount, po.tax_amount AS taxAmount, po.total_amount AS totalAmount, po.status, po.payment_method AS paymentMethod, po.customer_name AS customerName, po.customer_email AS customerEmail, po.customer_phone AS customerPhone, po.metadata_json AS metadataJson, po.admin_note AS adminNote, po.paid_at AS paidAt, po.cancelled_at AS cancelledAt, po.created_at AS createdAt, po.updated_at AS updatedAt, a.role accountRole FROM payment_orders po JOIN accounts a ON a.id=po.account_id ORDER BY po.created_at DESC LIMIT 500").all(),
      env.DB.prepare("SELECT id, order_id AS orderId, transaction_type AS transactionType, provider, provider_transaction_id AS providerTransactionId, amount, status, failure_code AS failureCode, failure_message AS failureMessage, processed_at AS processedAt FROM payment_transactions ORDER BY created_at DESC LIMIT 1000").all(),
      env.DB.prepare("SELECT id, order_id AS orderId, transaction_id AS transactionId, amount, reason, status, requested_by AS requestedBy, provider_refund_id AS providerRefundId, processed_at AS processedAt, created_at AS createdAt FROM payment_refunds ORDER BY created_at DESC LIMIT 500").all(),
      env.DB.prepare('SELECT id, actor_email AS actor, action, subject, created_at AS createdAt FROM admin_audit_logs ORDER BY created_at DESC LIMIT 100').all(),
      env.DB.prepare('SELECT id, request_type AS requestType, requester_name AS requesterName, phone, email, specialty, payload_json AS payloadJson, status, admin_note AS adminNote, email_notification_status AS emailNotificationStatus, sms_notification_status AS smsNotificationStatus, created_at AS createdAt, updated_at AS updatedAt FROM consultation_requests ORDER BY created_at DESC LIMIT 300').all(),
      env.DB.prepare("SELECT c.id, c.consultation_id AS consultationId, c.hospital_name AS hospitalName, c.specialty, c.position_title AS positionTitle, c.stage, c.assigned_recruiter AS assignedRecruiter, c.success_fee_terms AS successFeeTerms, c.estimated_fee AS estimatedFee, c.next_action AS nextAction, c.billing_status AS billingStatus, c.hired_at AS hiredAt, c.created_at AS createdAt, c.updated_at AS updatedAt, COUNT(s.id) AS candidateCount FROM recruitment_cases c LEFT JOIN candidate_submissions s ON s.case_id = c.id GROUP BY c.id ORDER BY c.updated_at DESC LIMIT 300").all(),
      env.DB.prepare("SELECT r.id, r.title, r.profession, r.specialty, r.name, r.phone, r.email, r.desired_regions AS desiredRegions, r.completion, r.visibility, r.status, r.created_at AS createdAt, r.updated_at AS updatedAt, a.role accountRole FROM resumes r JOIN accounts a ON a.id=r.account_id ORDER BY r.updated_at DESC LIMIT 300").all().catch(() => ({ results: [] }))
    ]);
    const settings = Object.fromEntries((settingsResult.results || []).map(row => [row.settingKey, row.settingKey === 'maintenanceMode' ? row.settingValue === 'true' : row.settingValue]));
    const features = Object.fromEntries((featuresResult.results || []).map(row => [row.flagKey, Boolean(row.enabled)]));
    return json({
      admin,
      metrics: {
        accounts:Number(accounts?.total || 0), doctors:Number(accounts?.doctors || 0), hospitals:Number(accounts?.hospitals || 0),
        consultations:Number(consultations?.total || 0), activeCases:Number(cases?.active || 0), hiredCases:Number(cases?.hired || 0),
        categories:Number(categories?.total || 0), contents:Number(contentCount?.total || 0), auditLogs:Number(auditCount?.total || 0),
        payments:Number(paymentMetrics?.total || 0), pendingPayments:Number(paymentMetrics?.pending || 0), paidRevenue:Number(paymentMetrics?.paid_revenue || 0), refundedPayments:Number(paymentMetrics?.refunded || 0)
      },
      settings, features,
      categories:(categoryResult.results || []).map(row => ({ ...row, enabled:Boolean(row.enabled) })),
      contents:(contentResult.results || []).map(row => ({ ...row, payload:parseJsonObject(row.payloadJson) })),
      members:memberResult.results || [],
      payments:(paymentResult.results || []).map(row => { const { metadataJson, ...rest } = row; const meta = parseJsonObject(metadataJson) || {}; return { ...rest, exposure: meta.exposure || null }; }),
      transactions:transactionResult.results || [],
      refunds:refundResult.results || [],
      audit:auditResult.results || [],
      consultations:(consultationResult.results || []).map(row => {
        let payload = {};
        try { payload = JSON.parse(row.payloadJson || '{}'); } catch {}
        const { payloadJson, ...record } = row;
        return { ...record, payload };
      }),
      cases:caseResult.results || [],
      resumes:resumeResult.results || []
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
  } else if (action === 'content_create' || action === 'content_update') {
    const allowedTypes = ['doctor_job','medical_job','talent_profile','notice'];
    const allowedStatuses = ['draft','published','hidden','closed'];
    const allowedVisibility = ['public','doctor','hospital','admin'];
    const contentType = String(payload.contentType || '');
    const title = String(payload.title || '').trim().slice(0,180);
    const subtitle = String(payload.subtitle || '').trim().slice(0,300);
    const status = String(payload.status || 'draft');
    const visibility = String(payload.visibility || 'public');
    const details = payload.payload && typeof payload.payload === 'object' ? payload.payload : {};
    if (!allowedTypes.includes(contentType) || !title || !allowedStatuses.includes(status) || !allowedVisibility.includes(visibility)) return json({ error:'콘텐츠 입력값을 확인해주세요.' }, 400);
    // 상단 고정(pin): 최대 5개까지. sort_order를 고정 순서로 사용(고정=100 이상, 일반=0).
    const PIN_LIMIT = 5;
    const wantPinned = Boolean(payload.pinned);
    const editingId = action === 'content_update' ? String(payload.id || '') : '';
    if (wantPinned) {
      const pinnedRow = await env.DB.prepare("SELECT COUNT(*) c FROM admin_content_records WHERE sort_order >= 100 AND id != ?").bind(editingId).first();
      if (Number(pinnedRow?.c || 0) >= PIN_LIMIT) return json({ error:'상단 고정은 최대 ' + PIN_LIMIT + '개까지 가능합니다. 다른 고정을 해제한 뒤 다시 시도해 주세요.', code:'PIN_LIMIT' }, 400);
    }
    const sortOrder = wantPinned ? 100 : 0;
    if (action === 'content_create') {
      const id = crypto.randomUUID();
      await env.DB.prepare('INSERT INTO admin_content_records (id, content_type, title, subtitle, status, visibility, payload_json, sort_order, created_by, updated_by, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id, contentType, title, subtitle, status, visibility, JSON.stringify(details), sortOrder, admin.email, admin.email, status === 'published' ? new Date().toISOString() : null).run();
      await writeAdminAudit(env, admin, 'content_create', title, { id, contentType, status, pinned: wantPinned });
    } else {
      const id = editingId;
      if (!id) return json({ error:'수정할 콘텐츠를 확인해주세요.' }, 400);
      await env.DB.prepare("UPDATE admin_content_records SET content_type=?, title=?, subtitle=?, status=?, visibility=?, payload_json=?, sort_order=?, updated_by=?, published_at=CASE WHEN ?='published' THEN COALESCE(published_at, CURRENT_TIMESTAMP) ELSE published_at END, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(contentType, title, subtitle, status, visibility, JSON.stringify(details), sortOrder, admin.email, status, id).run();
      await writeAdminAudit(env, admin, 'content_update', title, { id, contentType, status, pinned: wantPinned });
    }
  } else if (action === 'content_delete') {
    const id = String(payload.id || '');
    if (!id) return json({ error:'삭제할 콘텐츠를 확인해주세요.' }, 400);
    const record = await env.DB.prepare('SELECT title, content_type AS contentType FROM admin_content_records WHERE id = ?').bind(id).first();
    await env.DB.prepare('DELETE FROM admin_content_records WHERE id = ?').bind(id).run();
    await writeAdminAudit(env, admin, 'content_delete', record?.title || id, { id, contentType:record?.contentType || '' });
  } else if (action === 'member_update') {
    const id = String(payload.id || '');
    const status = String(payload.status || '');
    const verificationStatus = String(payload.verificationStatus || '');
    const note = String(payload.adminNote || '').trim().slice(0,2000);
    if (!id || !['active','suspended','withdrawn'].includes(status) || !['unverified','pending','verified','rejected'].includes(verificationStatus)) return json({ error:'회원 상태를 확인해주세요.' }, 400);
    await env.DB.prepare("INSERT INTO account_admin_profiles (account_id, status, verification_status, admin_note, updated_by) VALUES (?, ?, ?, ?, ?) ON CONFLICT(account_id) DO UPDATE SET status=excluded.status, verification_status=excluded.verification_status, admin_note=excluded.admin_note, updated_by=excluded.updated_by, updated_at=CURRENT_TIMESTAMP").bind(id, status, verificationStatus, note, admin.email).run();
    await writeAdminAudit(env, admin, 'member_update', id, { status, verificationStatus });
  } else if (action === 'payment_update') {
    const id = String(payload.id || '');
    const status = String(payload.status || '');
    const allowedStatuses = ['pending_review','awaiting_payment','paid','failed','cancelled'];
    if (!id || !allowedStatuses.includes(status)) return json({ error:'결제 상태를 확인해주세요.' }, 400);
    const order = await env.DB.prepare('SELECT order_number AS orderNumber, status, total_amount AS totalAmount, supply_amount AS supplyAmount, tax_amount AS taxAmount, product_id AS productId, metadata_json AS metadataJson FROM payment_orders WHERE id=?').bind(id).first();
    if (!order) return json({ error:'주문을 찾을 수 없습니다.' }, 404);
    // 결제 완료 시 노출기간 부여, 취소/실패 시 노출 회수(metadata exposure 제거).
    const exposureMeta = (() => {
      const meta = { ...(parseJsonObject(order.metadataJson) || {}) };
      if (status === 'paid') {
        const product = paymentProductCatalog[String(order.productId || '')];
        if (product?.exposureDays) { const start = new Date(); const end = new Date(start.getTime() + product.exposureDays * 86400000); meta.exposure = { start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10), days: product.exposureDays }; }
      } else if (status === 'cancelled' || status === 'failed') {
        delete meta.exposure;
      }
      return JSON.stringify(meta).slice(0, 12000);
    })();
    const method = ['card','transfer'].includes(payload.paymentMethod) ? payload.paymentMethod : '';
    const provider = cleanOrderValue(payload.provider || 'manual', 60);
    const providerTransactionId = cleanOrderValue(payload.providerTransactionId, 180);
    const adminNote = cleanOrderValue(payload.adminNote, 2000);
    const transactionType = status === 'paid' ? 'capture' : status === 'failed' ? 'failure' : status === 'cancelled' ? 'cancellation' : '';
    const statements = [
      env.DB.prepare("UPDATE payment_orders SET status=?, payment_method=CASE WHEN ?='' THEN payment_method ELSE ? END, admin_note=?, metadata_json=?, paid_at=CASE WHEN ?='paid' THEN COALESCE(paid_at,CURRENT_TIMESTAMP) ELSE paid_at END, cancelled_at=CASE WHEN ?='cancelled' THEN CURRENT_TIMESTAMP ELSE cancelled_at END, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(status, method, method, adminNote, exposureMeta, status, status, id),
      env.DB.prepare('INSERT INTO payment_events (id, order_id, actor_key, event_type, from_status, to_status, detail_json) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), id, admin.email, 'admin_status_update', order.status, status, JSON.stringify({ provider, providerTransactionId, adminNote }))
    ];
    if (transactionType && order.status !== status) statements.push(env.DB.prepare('INSERT INTO payment_transactions (id, order_id, transaction_type, provider, provider_transaction_id, amount, status) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), id, transactionType, provider, providerTransactionId, Number(order.totalAmount), status === 'failed' ? 'failed' : status === 'cancelled' ? 'cancelled' : 'succeeded'));
    if (status === 'paid') statements.push(env.DB.prepare("INSERT OR IGNORE INTO payment_receipts (id, order_id, receipt_number, supply_amount, tax_amount, total_amount) VALUES (?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), id, 'R-' + order.orderNumber, Number(order.supplyAmount), Number(order.taxAmount), Number(order.totalAmount)));
    await env.DB.batch(statements);
    await writeAdminAudit(env, admin, 'payment_update', order.orderNumber, { from:order.status, to:status, amount:order.totalAmount });
  } else if (action === 'refund_create') {
    const orderId = String(payload.orderId || '');
    const amount = Math.max(0, Math.floor(Number(payload.amount) || 0));
    const reason = cleanOrderValue(payload.reason, 500);
    const order = await env.DB.prepare("SELECT order_number AS orderNumber, total_amount AS totalAmount, status, metadata_json AS metadataJson FROM payment_orders WHERE id=?").bind(orderId).first();
    if (!order || !['paid','partially_refunded'].includes(order.status)) return json({ error:'환불 가능한 결제 주문을 확인해주세요.' }, 400);
    // 이미 확정(succeeded)된 환불 합계만 집계해 초과환불 방지(집계 기준을 refund_resolve와 통일).
    const previous = await env.DB.prepare("SELECT COALESCE(SUM(amount),0) total FROM payment_refunds WHERE order_id=? AND status='succeeded'").bind(orderId).first();
    if (!amount || amount > Number(order.totalAmount) - Number(previous?.total || 0)) return json({ error:'환불 가능 금액을 확인해주세요.' }, 400);
    const id = crypto.randomUUID();
    const totalRefunded = Number(previous?.total || 0) + amount;
    const fullyRefunded = totalRefunded >= Number(order.totalAmount);
    const statements = [
      // 관리자 직접환불은 즉시 확정(succeeded)으로 기록(회원 요청은 별도로 requested).
      env.DB.prepare("INSERT INTO payment_refunds (id, order_id, amount, reason, status, requested_by, processed_at) VALUES (?, ?, ?, ?, 'succeeded', ?, CURRENT_TIMESTAMP)").bind(id, orderId, amount, reason, admin.email),
      // 환불 거래기록(대사·정산용).
      env.DB.prepare("INSERT INTO payment_transactions (id, order_id, transaction_type, provider, provider_transaction_id, amount, status, processed_at) VALUES (?, ?, 'refund', 'manual', ?, ?, 'succeeded', CURRENT_TIMESTAMP)").bind(crypto.randomUUID(), orderId, id, amount),
      env.DB.prepare("INSERT INTO payment_events (id, order_id, actor_key, event_type, detail_json) VALUES (?, ?, ?, 'refund_processed', ?)").bind(crypto.randomUUID(), orderId, admin.email, JSON.stringify({ refundId:id, amount, reason }))
    ];
    // 전액 환불이면 주문을 환불 상태로 전이하고 광고 노출기간과 인재 열람권을 회수한다.
    if (fullyRefunded) {
      const meta = { ...(parseJsonObject(order.metadataJson) || {}) };
      delete meta.exposure;
      statements.push(env.DB.prepare("UPDATE payment_orders SET status='refunded', metadata_json=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(JSON.stringify(meta).slice(0,12000), orderId));
      statements.push(env.DB.prepare("DELETE FROM talent_unlocks WHERE order_id=?").bind(orderId));
    } else {
      statements.push(env.DB.prepare("UPDATE payment_orders SET status='partially_refunded', updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(orderId));
    }
    await env.DB.batch(statements);
    await writeAdminAudit(env, admin, 'refund_create', order.orderNumber, { refundId:id, amount, reason, fullyRefunded });
  } else if (action === 'refund_resolve') {
    // 회원이 요청한 환불(status='requested')을 관리자가 승인(금액 확정) 또는 거부한다.
    const refundId = String(payload.refundId || '');
    const decision = payload.decision === 'approve' ? 'approve' : payload.decision === 'reject' ? 'reject' : '';
    if (!refundId || !decision) return json({ error:'환불 요청과 처리 방식을 확인해주세요.' }, 400);
    const refund = await env.DB.prepare("SELECT r.id, r.order_id AS orderId, r.status, o.order_number AS orderNumber, o.total_amount AS totalAmount, o.status AS orderStatus, o.metadata_json AS metadataJson FROM payment_refunds r JOIN payment_orders o ON o.id=r.order_id WHERE r.id=?").bind(refundId).first();
    if (!refund || refund.status !== 'requested') return json({ error:'처리 대기 중인 환불 요청을 확인해주세요.' }, 400);
    if (decision === 'reject') {
      const note = cleanOrderValue(payload.reason, 500);
      await env.DB.batch([
        env.DB.prepare("UPDATE payment_refunds SET status='rejected', reason=CASE WHEN ?='' THEN reason ELSE reason || ' / 거부: ' || ? END, processed_at=CURRENT_TIMESTAMP WHERE id=?").bind(note, note, refundId),
        env.DB.prepare("INSERT INTO payment_events (id, order_id, actor_key, event_type, detail_json) VALUES (?, ?, ?, 'refund_rejected', ?)").bind(crypto.randomUUID(), refund.orderId, admin.email, JSON.stringify({ refundId, note }).slice(0,4000))
      ]);
      await writeAdminAudit(env, admin, 'refund_resolve', refund.orderNumber, { refundId, decision:'reject' });
      return json({ saved:true });
    }
    // approve: 환불 금액 확정(미지정 시 전액), 초과 방지.
    const already = await env.DB.prepare("SELECT COALESCE(SUM(amount),0) total FROM payment_refunds WHERE order_id=? AND status='succeeded'").bind(refund.orderId).first();
    const remaining = Number(refund.totalAmount) - Number(already?.total || 0);
    const amount = payload.amount ? Math.max(0, Math.floor(Number(payload.amount))) : remaining;
    if (!amount || amount > remaining) return json({ error:'환불 가능 금액을 확인해주세요.' }, 400);
    const fullyRefunded = Number(already?.total || 0) + amount >= Number(refund.totalAmount);
    const statements = [
      env.DB.prepare("UPDATE payment_refunds SET amount=?, status='succeeded', processed_at=CURRENT_TIMESTAMP WHERE id=?").bind(amount, refundId),
      // 환불 거래기록(대사·정산용).
      env.DB.prepare("INSERT INTO payment_transactions (id, order_id, transaction_type, provider, provider_transaction_id, amount, status, processed_at) VALUES (?, ?, 'refund', 'manual', ?, ?, 'succeeded', CURRENT_TIMESTAMP)").bind(crypto.randomUUID(), refund.orderId, refundId, amount),
      env.DB.prepare("INSERT INTO payment_events (id, order_id, actor_key, event_type, detail_json) VALUES (?, ?, ?, 'refund_approved', ?)").bind(crypto.randomUUID(), refund.orderId, admin.email, JSON.stringify({ refundId, amount, fullyRefunded }).slice(0,4000))
    ];
    if (fullyRefunded) {
      const meta = { ...(parseJsonObject(refund.metadataJson) || {}) };
      delete meta.exposure;
      statements.push(env.DB.prepare("UPDATE payment_orders SET status='refunded', metadata_json=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(JSON.stringify(meta).slice(0,12000), refund.orderId));
      // 인재 열람권 회수: 환불 후 연락처 계속 열람 방지.
      statements.push(env.DB.prepare("DELETE FROM talent_unlocks WHERE order_id=?").bind(refund.orderId));
    } else {
      statements.push(env.DB.prepare("UPDATE payment_orders SET status='partially_refunded', updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(refund.orderId));
    }
    await env.DB.batch(statements);
    await writeAdminAudit(env, admin, 'refund_resolve', refund.orderNumber, { refundId, decision:'approve', amount, fullyRefunded });
  } else {
    return json({ error:'지원하지 않는 관리 작업입니다.' }, 400);
  }
  return json({ saved:true });
}
async function responseFor(request, env) {
  const pathname = new URL(request.url).pathname;
  if (pathname === '/api/categories') return publicCategoriesApi(request, env);
  if (pathname === '/api/site-operations') return publicSiteOperationsApi(request, env);
  if (pathname === '/api/account') return accountApi(request, env);
  if (pathname === '/api/member-center') return memberCenterApi(request, env);
  if (pathname === '/api/resumes') return resumeApi(request, env);
  if (pathname === '/api/saved-jobs') return savedJobsApi(request, env);
  if (pathname.startsWith('/api/talent-detail/')) return talentDetailApi(request, env, pathname);
  if (pathname === '/api/payment-orders') return paymentOrderApi(request, env);
  if (pathname === '/api/payment-approve') return paymentApproveApi(request, env);
  if (pathname === '/api/consultations' || pathname.startsWith('/api/consultations/')) return consultationApi(request, env, pathname);
  if (pathname === '/api/recruitment-crm' || pathname.startsWith('/api/recruitment-crm/')) return recruitmentCrmApi(request, env, pathname);
  if (pathname === '/api/talent-access-audit') return talentAccessAuditApi(request, env);
  if (pathname === '/api/admin-console') return adminConsoleApi(request, env);
  if (pathname === cssPath) return new Response(css, { status: 200, headers: { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'public, max-age=31536000, immutable' } });
  if (pathname === jsPath) return new Response(js, { status: 200, headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'public, max-age=31536000, immutable' } });
  if (pathname === '/medihelpers-logo.svg') return new Response(logoSvg, { status: 200, headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'public, max-age=31536000, immutable' } });
  if (pathname === '/og-medihelpers.jpg') return new Response(binary(ogBase64), { status: 200, headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=86400' } });
  if (pathname === '/og-medihelpers-v2.jpg') return new Response(binary(ogBase64), { status: 200, headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=31536000, immutable' } });
  if (pathname === '/favicon.png') return new Response(binary(faviconBase64), { status: 200, headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=31536000, immutable' } });
  if (pathname === '/apple-touch-icon.png') return new Response(binary(appleIconBase64), { status: 200, headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=31536000, immutable' } });
  if (pathname === '/samcheonpo-jeil-brand-mark.png') return new Response(binary(samcheonpoBrandBase64), { status: 200, headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=31536000, immutable' } });
  if (pathname === '/samcheonpo-jeil-horizontal-logo-v2.png') return new Response(binary(samcheonpoHorizontalLogoBase64), { status: 200, headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=31536000, immutable' } });
  if (pathname === '/isarang-children-brand-mark.png') return new Response(binary(isarangBrandBase64), { status: 200, headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=31536000, immutable' } });
  if (pathname === '/isarang-children-recruitment-banner-v2.png') return new Response(binary(isarangBannerBase64), { status: 200, headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=31536000, immutable' } });
  if (pathname === '/assets/medi-angel-assistant-v2.png') return new Response(binary(mediAngelBase64), { status: 200, headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=31536000, immutable' } });
  if (pathname === '/hero-medihelpers-poster.jpg') return binaryAsset(request, heroPosterBase64, 'image/jpeg');
  if (pathname === '/hero-medihelpers.mp4') return binaryAsset(request, heroVideoBase64, 'video/mp4');
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
