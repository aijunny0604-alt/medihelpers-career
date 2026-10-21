import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Run each screen's actual handler, including navigation and failure feedback.
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
function handler(file, scope, deps) {
  const text = readFileSync(new URL(file, import.meta.url), 'utf8').split(scope)[1];
  const body = text.match(/const signOut = async \(\) => \{([\s\S]*?)\n  \};/)[1];
  return new AsyncFunction(...Object.keys(deps), body).bind(null, ...Object.values(deps));
}

for (const [file, scope] of [['./main.jsx', 'function Header('], ['./AccountPage.jsx', 'function AccountCard(']]) {
  test(`${file} 로그아웃 실패는 현재 화면과 세션을 유지하고 다시 시도할 수 있다`, async () => {
    const window = { location: { href: '/account' } };
    const states = [], notices = [];
    const signingOutRef = { current: false };
    const run = handler(file, scope, {
      signingOut: false, signingOutRef,
      setSigningOut: value => states.push(value),
      authRequest: async () => { throw Error('네트워크 오류'); },
      window, withBase: path => path, notifyAction: text => notices.push(text),
    });
    await run();
    assert.equal(window.location.href, '/account');
    assert.deepEqual(states, [true, false]);
    assert.equal(signingOutRef.current, false);
    assert.match(notices[0], /로그아웃을 완료하지 못했습니다/);
  });
  test(`${file} 로그아웃 확인 이후에만 홈으로 이동한다`, async () => {
    const window = { location: { href: '/account' } };
    let resolve;
    const pending = new Promise(done => { resolve = done; });
    const run = handler(file, scope, {
      signingOut: false, signingOutRef: { current: false }, setSigningOut: () => {},
      authRequest: () => pending, window, withBase: path => path,
      notifyAction: () => assert.fail('성공에 오류 안내 없음'),
    });
    const result = run();
    assert.equal(window.location.href, '/account');
    resolve({ signedOut: true });
    await result;
    assert.equal(window.location.href, '/');
  });
}
