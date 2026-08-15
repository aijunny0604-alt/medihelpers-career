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

test('작은 노트북에서는 결제 요약과 입력 영역을 세로로 배치한다', () => {
  assert.match(styles, /@media\(max-width:1440px\)\{[\s\S]*?\.ad-apply-page \.checkout-grid\{grid-template-columns:1fr\}/);
  assert.match(styles, /@media\(max-width:1180px\)\{[\s\S]*?\.single-brand-upload\{grid-template-columns:1fr\}/);
  assert.match(styles, /@media\(min-width:1441px\)\{[\s\S]*?\.ad-apply-page \.checkout-grid\{grid-template-columns:minmax\(0,1fr\) 380px\}/);
  assert.match(styles, /@media\(min-width:781px\) and \(max-width:1180px\)\{[\s\S]*?\.single-brand-upload\{grid-template-columns:1fr\}/);
  assert.match(styles, /\.ad-apply-page \.checkout-form\{[^}]*min-width:0/);
  assert.match(styles, /\.ad-form-section\{[^}]*min-width:0/);
});
