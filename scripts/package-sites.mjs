import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { accountSchemaStatements } from '../db/schema.js';

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
const isarangBrandBase64 = ${JSON.stringify(isarangBrandBase64)};
const isarangBannerBase64 = ${JSON.stringify(isarangBannerBase64)};
const mediAngelBase64 = ${JSON.stringify(mediAngelBase64)};
const cssPath = ${JSON.stringify(cssPath)};
const jsPath = ${JSON.stringify(jsPath)};
const accountSchemaStatements = ${JSON.stringify(accountSchemaStatements)};
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
  if (pathname === cssPath) return new Response(css, { status: 200, headers: { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'public, max-age=31536000, immutable' } });
  if (pathname === jsPath) return new Response(js, { status: 200, headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'public, max-age=31536000, immutable' } });
  if (pathname === '/medihelpers-logo.svg') return new Response(logoSvg, { status: 200, headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'public, max-age=31536000, immutable' } });
  if (pathname === '/og-medihelpers.jpg') return new Response(binary(ogBase64), { status: 200, headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=86400' } });
  if (pathname === '/favicon.png') return new Response(binary(faviconBase64), { status: 200, headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=31536000, immutable' } });
  if (pathname === '/apple-touch-icon.png') return new Response(binary(appleIconBase64), { status: 200, headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=31536000, immutable' } });
  if (pathname === '/samcheonpo-jeil-brand-mark.png') return new Response(binary(samcheonpoBrandBase64), { status: 200, headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=31536000, immutable' } });
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
