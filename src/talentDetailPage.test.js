import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('구직 인재 상세는 모달 대신 공유 가능한 독립 페이지로 열린다', async () => {
  const source = await readFile(new URL('./main.jsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('./styles.css', import.meta.url), 'utf8');

  assert.match(source, /function TalentDetailPage/);
  assert.match(source, /navigate\(`\/medical-staff\/talents\/\$\{encodeURIComponent\(person\.detailId \|\| person\.code\)\}`\)/);
  assert.match(source, /path\.startsWith\('\/medical-staff\/talents\/'\)/);
  assert.match(source, /목록 계속 보기/);
  assert.doesNotMatch(source, /function TalentDetailModal/);
  assert.match(styles, /\.talent-detail-page/);
  assert.match(styles, /\.talent-detail-back:focus-visible/);
});

test('헤드헌터 인증 표시와 데이터 플래그를 사용하지 않는다', async () => {
  const paths = ['./main.jsx', './styles.css', './data.js', './MedicalStaffPage.jsx', './HeadHunterRequestPage.jsx'];
  const sources = await Promise.all(paths.map((path) => readFile(new URL(path, import.meta.url), 'utf8')));
  const combined = sources.join('\n');

  assert.doesNotMatch(combined, /verifiedByHeadhunter|verified_by_headhunter/i);
  assert.doesNotMatch(combined, /헤드헌터 인증|HEADHUNTER VERIFIED|HEADHUNTER CHECK/i);
  assert.doesNotMatch(combined, /headhunter-verified-note|tag-verified/i);
});
