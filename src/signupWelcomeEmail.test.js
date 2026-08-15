import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server = readFileSync(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8');
const accountPage = readFileSync(new URL('./AccountPage.jsx', import.meta.url), 'utf8');
const main = readFileSync(new URL('./main.jsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

test('회원가입 성공 후 별도 축하 페이지로 이동한다', () => {
  assert.match(accountPage, /window\.location\.replace\(withBase\('\/signup\/welcome'\)\)/);
  assert.match(accountPage, /export function SignupWelcomePage/);
  assert.match(main, /path === '\/signup\/welcome'.*<SignupWelcomePage auth=\{auth\} \/>/);
  assert.match(accountPage, /회원가입을 축하드립니다!/);
  assert.match(accountPage, /role === 'hospital'[\s\S]*\/advertise[\s\S]*\/resume\?new=1/);
  assert.match(styles, /\.signup-welcome-page/);
  assert.match(styles, /@media\(max-width:780px\).*\.signup-welcome-actions/);
});

test('신규 가입자는 환영 메일을 받고 대표자 메일에는 가입 안내가 간다', () => {
  const start = server.indexOf('async function sendSignupEmails');
  const end = server.indexOf('async function hmacHex', start);
  const emailBlock = server.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(emailBlock, /send\(\[member\.email\], '\[메디헬퍼스\] 회원가입을 축하드립니다'/);
  assert.match(emailBlock, /signupAdminRecipients\(env\)/);
  assert.match(emailBlock, /신규 회원이 가입했습니다/);
  assert.match(emailBlock, /회원 유형/);
  assert.match(emailBlock, /가입 이메일/);
  assert.doesNotMatch(emailBlock, /body\.password|member\.password|password_hash|password_salt/);
});

test('이메일 실패는 가입을 취소하지 않고 백그라운드에서 처리한다', () => {
  assert.match(server, /const signupEmailTask = sendSignupEmails[\s\S]*ctx\.waitUntil\(signupEmailTask\)/);
  assert.match(server, /welcomeEmailAvailable:recoveryEmailConfigured\(env\)/);
  assert.match(server, /adminSignupEmailAvailable:signupAdminRecipients\(env\)\.length > 0/);
  assert.match(accountPage, /state\.welcomeEmailAvailable \? '가입 축하 메일을 전송 요청했습니다'/);
  assert.match(accountPage, /가입 정보는 정상적으로 저장되었습니다/);
});
