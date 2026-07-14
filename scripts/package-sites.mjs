import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

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

await rm('dist', { recursive: true, force: true });
await mkdir('dist/server', { recursive: true });
await mkdir('dist/.openai', { recursive: true });
await cp('.openai/hosting.json', 'dist/.openai/hosting.json');
const server = `const html = ${JSON.stringify(html)};
const css = ${JSON.stringify(css)};
const js = ${JSON.stringify(js)};
const logoSvg = ${JSON.stringify(logoSvg)};
const ogBase64 = ${JSON.stringify(ogBase64)};
const faviconBase64 = ${JSON.stringify(faviconBase64)};
const appleIconBase64 = ${JSON.stringify(appleIconBase64)};
const cssPath = ${JSON.stringify(cssPath)};
const jsPath = ${JSON.stringify(jsPath)};
function binary(base64) { return Uint8Array.from(atob(base64), value => value.charCodeAt(0)); }
function responseFor(request) {
  const pathname = new URL(request.url).pathname;
  if (pathname === cssPath) return new Response(css, { status: 200, headers: { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'public, max-age=31536000, immutable' } });
  if (pathname === jsPath) return new Response(js, { status: 200, headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'public, max-age=31536000, immutable' } });
  if (pathname === '/medihelpers-logo.svg') return new Response(logoSvg, { status: 200, headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'public, max-age=31536000, immutable' } });
  if (pathname === '/og-medihelpers.jpg') return new Response(binary(ogBase64), { status: 200, headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=86400' } });
  if (pathname === '/favicon.png') return new Response(binary(faviconBase64), { status: 200, headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=31536000, immutable' } });
  if (pathname === '/apple-touch-icon.png') return new Response(binary(appleIconBase64), { status: 200, headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=31536000, immutable' } });
  if (!pathname.includes('.')) return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60' } });
  return new Response('Not Found', { status: 404 });
}
export default { async fetch(request) { return responseFor(request); } };
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
