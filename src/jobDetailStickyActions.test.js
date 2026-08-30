import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const main = readFileSync(new URL('./main.jsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

test('공고 상세 지원 메뉴는 데스크톱에서 스크롤을 따라오고 작은 화면에서는 본문에 배치된다', () => {
  assert.match(main, /"job-detail-actions"/);
  assert.match(main, /const staticDetailRoute = path\.startsWith\('\/jobs\/'\)/);
  assert.match(main, /route-stage-static/);
  assert.match(styles, /\.route-stage\.route-stage-static\{[\s\S]*?animation:none!important;[\s\S]*?transform:none!important;/);
  assert.match(
    styles,
    /@media\(min-width:1181px\)[\s\S]*?\.detail-grid>\.job-detail-actions\{[\s\S]*?position:sticky;[\s\S]*?top:96px;[\s\S]*?align-self:start;/,
  );
  assert.match(
    styles,
    /\.modal-card\.embedded \.detail-grid>\.job-detail-actions\{[\s\S]*?animation:none!important;[\s\S]*?transform:none!important;/,
  );
  assert.match(styles, /\.modal-card\.embedded \.modal-scroll,[\s\S]*?\.modal-card\.embedded \.detail-grid\{[\s\S]*?overflow:visible;/);
  assert.match(
    styles,
    /@media\(max-width:1180px\)[\s\S]*?\.detail-grid>\.job-detail-actions\{[\s\S]*?position:static;[\s\S]*?width:100%;/,
  );
});
