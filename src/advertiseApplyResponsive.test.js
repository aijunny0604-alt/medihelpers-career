import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./main.jsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
const applyPage = source.slice(source.indexOf('function Checkout'), source.indexOf('function TalentUnlockCheckout'));

test('공고 등록 필수 항목은 별표 대신 빨간 필수 문구를 사용한다', () => {
  for (const label of ['병원명', '기관 유형', '담당자명', '연락처', '이메일', '병원 위치', '초빙 분야']) {
    assert.match(applyPage, new RegExp(`${label} <b className="required-label">필수<\\/b>`));
    assert.doesNotMatch(applyPage, new RegExp(`${label} \\*`));
  }
  assert.match(styles, /\.ad-apply-page \.required-label\{[^}]*color:#d93b4d/);
});

test('공고 등록 연락처는 숫자 입력을 휴대폰 하이픈 형식으로 자동 정리한다', () => {
  assert.match(source, /import \{ formatKoreanPhone \} from '\.\/signupFields\.js';/);
  assert.match(applyPage, /name="phone"[\s\S]*?inputMode="numeric"[\s\S]*?maxLength=\{13\}[\s\S]*?formatKoreanPhone\(event\.currentTarget\.value\)/);
});

test('공고 등록 최종 동의 체크박스는 문구와 나란히 정렬된다', () => {
  assert.match(applyPage, /className="consent ad-checkout-consent"/);
  assert.match(styles, /\.ad-apply-page \.checkout-form \.ad-checkout-consent\{[^}]*grid-template-columns:22px minmax\(0,1fr\)[^}]*align-items:start/);
  assert.match(styles, /\.ad-apply-page \.checkout-form \.ad-checkout-consent input\{[^}]*width:22px!important[^}]*height:22px!important[^}]*min-height:22px!important/);
  assert.match(styles, /\.ad-apply-page \.checkout-form \.ad-checkout-consent input:checked\{[^}]*background:var\(--blue\)/);
});

test('작은 노트북에서는 결제 요약과 입력 영역을 세로로 배치한다', () => {
  assert.match(styles, /@media\(max-width:1440px\)\{[\s\S]*?\.ad-apply-page \.checkout-grid\{grid-template-columns:1fr\}/);
  assert.match(styles, /@media\(max-width:1180px\)\{[\s\S]*?\.single-brand-upload\{grid-template-columns:1fr\}/);
  assert.match(styles, /@media\(min-width:1441px\)\{[\s\S]*?\.ad-apply-page \.checkout-grid\{grid-template-columns:minmax\(0,1fr\) 380px\}/);
  assert.match(styles, /@media\(min-width:781px\) and \(max-width:1180px\)\{[\s\S]*?\.single-brand-upload\{grid-template-columns:1fr\}/);
  assert.match(styles, /\.ad-apply-page \.checkout-form\{[^}]*min-width:0/);
  assert.match(styles, /\.ad-form-section\{[^}]*min-width:0/);
});

test('긴 공고 등록 폼은 마지막과 스크롤 중 모두 결제·게시 버튼을 제공한다', () => {
  assert.match(applyPage, /className="ad-form-submit-panel" ref=\{finalActionRef\}/);
  assert.match(applyPage, /className=\{`ad-submit-dock \$\{finalActionVisible \? "is-hidden" : ""\}`\}/);
  assert.match(applyPage, /new IntersectionObserver\(/);
  assert.match(styles, /@media\(max-width:1440px\)\{[\s\S]*?\.ad-submit-dock\{position:fixed/);
  assert.match(styles, /\.ad-submit-dock\.is-hidden\{[^}]*pointer-events:none/);
  assert.match(styles, /@media\(max-width:780px\)\{[\s\S]*?\.ad-form-submit-panel\{[^}]*flex-direction:column/);
});
